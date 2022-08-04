// Copyright 2022 Singularity Data
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

mod utils;

use std::{u8, usize};

use bytes::{BufMut, Buf};
use fixedbitset::FixedBitSet;
use paste::paste;
use risingwave_pb::data::DataType;

use crate::array::{ListRef, ListValue, StructRef, StructValue};
use crate::types::decimal::DECIMAL_SERDE_SIZE;
use crate::types::{
    DataType, Decimal, IntervalUnit, NaiveDateTimeWrapper, NaiveDateWrapper, NaiveTimeWrapper,
    OrderedF32, OrderedF64, ScalarRefImpl,
};
use crate::util::value_encoding::*;
use crate::util::value_encoding::error::ValueEncodingError;

const BYTES_PER_FIXED_SIZE_SLOT: usize = 8;

struct RowV2 {
    bitmap: FixedBitSet,
    fix_len: Vec<u8>,
    var_len: Vec<u8>,
}

macro_rules! for_all_fix_len_types {
    ($macro:ident $(, $x:tt)*) => {
        $macro! {
            [$($x),*],
            { Int16, int16, i16, i16 },
            { Int32, int32, i32, i32 },
            { Int64, int64, i64, i64 },
            { Float32, float32, OrderedF32, OrderedF32 },
            { Float64, float64, OrderedF64, OrderedF64 }
            // { Bool, bool, bool, bool },
        }
    };
}

macro_rules! for_all_var_len_types {
    ($macro:ident $(, $x:tt)*) => {
        $macro! {
            [$($x),*],
            { Utf8, utf8, String, &'scalar str },
            { Decimal, decimal, Decimal, Decimal  },
            { Interval, interval, IntervalUnit, IntervalUnit },
            { NaiveDate, naivedate, NaiveDateWrapper, NaiveDateWrapper },
            { NaiveDateTime, naivedatetime, NaiveDateTimeWrapper, NaiveDateTimeWrapper },
            { NaiveTime, naivetime, NaiveTimeWrapper, NaiveTimeWrapper },
            { Struct, struct, StructValue, StructRef<'scalar> },
            { List, list, ListValue, ListRef<'scalar> }
        }
    };
}

macro_rules! impl_set_fix_len_scalar {
    ([], $( { $variant_name:ident, $suffix_name:ident, $scalar:ty, $scalar_ref:ty } ),*) => {
        impl RowV2 {
            paste! {
            $(
                pub fn [<set_ $suffix_name>](&mut self, pos: usize, value: $scalar) {
                    let bytes = value.to_le_bytes();
                    self.set_bytes_fix(pos, &bytes);
                }
            )*
            }
        }
    };
}

macro_rules! impl_set_fix_scalar_ref {
    ([], $( { $variant_name:ident, $suffix_name:ident, $scalar:ty, $scalar_ref:ty } ),*) => {
        impl RowV2 {
            pub fn set_fix_scalar_ref(&mut self, pos: usize, value: ScalarRefImpl) {
                paste! {
                    match value {
                        $( ScalarRefImpl::$variant_name(inner) => self.[<set_ $suffix_name>](pos, inner), )*
                        ScalarRefImpl::Bool(inner) => self.set_bool(pos, inner),
                        _ => unreachable!{"{:?} is not fix length type", value},
                    }
                }
            }

            pub fn get_fix_scalar_ref(&mut self, pos: usize, value: ScalarRefImpl) {
                paste! {
                    match value {
                        $( ScalarRefImpl::$variant_name(inner) => self.[<set_ $suffix_name>](pos, inner), )*
                        ScalarRefImpl::Bool(inner) => self.set_bool(pos, inner),
                        _ => unreachable!{"{:?} is not fix length type", value},
                    }
                }
            }
        }
    };
}

macro_rules! impl_set_var_scalar_ref {
    ([], $( { $variant_name:ident, $suffix_name:ident, $scalar:ty, $scalar_ref:ty } ),*) => {
        impl RowV2 {
            pub fn set_var_scalar_ref(&mut self, pos: usize, value: ScalarRefImpl) {
                paste! {
                    match value {
                        $( ScalarRefImpl::$variant_name(inner) => self.[<set_ $suffix_name>](pos, inner), )*
                        _ => unreachable!{"{:?} is not variable length type", value},
                    }
                }
            }
        }
    };
}

for_all_fix_len_types! { impl_set_fix_len_scalar }
for_all_fix_len_types! { impl_set_fix_scalar_ref }
for_all_var_len_types! { impl_set_var_scalar_ref }

impl RowV2 {
    pub fn with_arity(arity: usize) -> Self {
        Self {
            bitmap: FixedBitSet::with_capacity(arity),
            fix_len: Vec::with_capacity(arity * BYTES_PER_FIXED_SIZE_SLOT),
            var_len: vec![],
        }
    }

    fn calc_offset(pos: usize) -> usize {
        pos * BYTES_PER_FIXED_SIZE_SLOT
    }

    fn set_bytes_fix(&mut self, pos: usize, bytes: &[u8]) {
        let offset = Self::calc_offset(pos);
        assert!(bytes.len() <= 8);
        Self::set_bytes(&mut self.fix_len, offset, bytes);
    }

    fn set_bytes_var(&mut self, offset: usize, bytes: &[u8]) {
        Self::set_bytes(&mut self.var_len, offset, bytes);
    }

    fn set_bytes(base: &mut [u8], offset: usize, bytes: &[u8]) {
        let len = bytes.len();
        base[offset..offset + len].copy_from_slice(bytes);
    }

    fn set_offset_and_len(&mut self, pos: usize, offset: usize, len: usize) {
        let offset_and_len = (offset as u64) << 32 | len as u64;
        self.set_bytes_fix(pos, &offset_and_len.to_le_bytes());
    }

    // return tuple(offset, len)
    fn get_offset_and_len(&mut self, pos: usize) -> (usize, usize) {
        let entry_offset = Self::calc_offset(pos);
        let offset_and_len = utils::get_u64_le(&mut self.fix_len[entry_offset..]);
        let offset = (offset_and_len >> 32) as usize;
        let len = (offset_and_len & 0x8fu64) as usize;
        (offset, len)
    }

    fn set_null(&mut self, pos: usize) {
        self.bitmap.set(pos, true);
    }

    // Need this because bool does not implement `to_le_bytes`.
    fn set_bool(&mut self, pos: usize, value: bool) {
        let bytes = (value as u8).to_le_bytes();
        self.set_bytes_fix(pos, &bytes);
    }

    fn set_decimal(&mut self, pos: usize, value: Decimal) {
        let offset = self.var_len.len();
        serialize_decimal(&value, &mut self.var_len);
        let len = self.var_len.len() - offset;
        assert_eq!(len, DECIMAL_SERDE_SIZE);
        self.set_offset_and_len(pos, offset, len);
    }

    fn set_utf8(&mut self, pos: usize, value: &str) {
        let offset = self.var_len.len();
        let bytes = value.as_bytes();
        self.var_len.put_slice(bytes);
        self.set_offset_and_len(pos, offset, bytes.len());
    }

    fn set_interval(&mut self, pos: usize, value: IntervalUnit) {
        let offset = self.var_len.len();
        serialize_interval(&value, &mut self.var_len);
        let len = self.var_len.len() - offset;
        self.set_offset_and_len(pos, offset, len);
    }

    fn set_naivedate(&mut self, pos: usize, value: NaiveDateWrapper) {
        let offset = self.var_len.len();
        serialize_naivedate(&value, &mut self.var_len);
        let len = self.var_len.len() - offset;
        assert_eq!(len, 4);
        self.set_offset_and_len(pos, offset, len);
    }

    fn set_naivedatetime(&mut self, pos: usize, value: NaiveDateTimeWrapper) {
        let offset = self.var_len.len();
        serialize_naivedatetime(&value, &mut self.var_len);
        let len = self.var_len.len() - offset;
        assert_eq!(len, 12);
        self.set_offset_and_len(pos, offset, len);
    }

    fn set_naivetime(&mut self, pos: usize, value: NaiveTimeWrapper) {
        let offset = self.var_len.len();
        serialize_naivetime(&value, &mut self.var_len);
        let len = self.var_len.len() - offset;
        assert_eq!(len, 8);
        self.set_offset_and_len(pos, offset, len);
    }

    fn set_struct(&mut self, pos: usize, value: StructRef) {
        let offset = self.var_len.len();
        let bytes = match value {
            StructRef::ValueRef { val } => val.to_protobuf_owned(),
            _ => unreachable!("Indexed is no serializable!"),
        };
        self.var_len.put_slice(&bytes);
        self.set_offset_and_len(pos, offset, bytes.len());
    }

    fn set_list(&mut self, pos: usize, value: ListRef) {
        let offset = self.var_len.len();
        let bytes = match value {
            ListRef::ValueRef { val } => val.to_protobuf_owned(),
            _ => unreachable!("Indexed is no serializable!"),
        };
        self.var_len.put_slice(&bytes);
        self.set_offset_and_len(pos, offset, bytes.len());
    }

    fn get_bytes_var(&mut self, offset: usize, bytes: &[u8]) {
        Self::set_bytes(&mut self.var_len, offset, bytes);
    }

    fn get_bytes(base: &mut [u8], offset: usize, bytes: &[u8]) {
        let len = bytes.len();
        base[offset..offset + len].copy_from_slice(bytes);
    }

    fn get_bool(&mut self, pos: usize) -> bool {
        let offset = Self::calc_offset(pos);
        let data = utils::get_u8_le(&mut self.fix_len[offset..]);
        match data {
            1 => true,
            0 => false,
            // value => Err(ValueEncodingError::InvalidBoolEncoding(value).into()),
            _ => unreachable!("invalid bool encoding"),
        }
    }

    fn get_int16(&mut self, pos: usize) -> i16 {
        let offset = Self::calc_offset(pos);
        utils::get_i16_le(&mut self.fix_len[offset..])
    }

    fn get_int32(&mut self, pos: usize) -> i32 {
        let offset = Self::calc_offset(pos);
        utils::get_i32_le(&mut self.fix_len[offset..])
    }

    fn get_int64(&mut self, pos: usize) -> i64 {
        let offset = Self::calc_offset(pos);
        utils::get_i64_le(&mut self.fix_len[offset..])
    }

    fn get_float32(&mut self, pos: usize) -> OrderedF32 {
        let offset = Self::calc_offset(pos);
        utils::get_f32_le(&mut self.fix_len[offset..]).into()
    }

    fn get_float64(&mut self, pos: usize) -> OrderedF64 {
        let offset = Self::calc_offset(pos);
        utils::get_f64_le(&mut self.fix_len[offset..]).into()
    }

    fn get_utf8(&mut self, pos: usize) -> String {
        let (offset, len) = self.get_offset_and_len(pos);
        let mut bytes =  &self.var_len[offset..];
        let mut string = vec![0; len as usize];
        bytes.copy_to_slice(&mut string);
        String::from_utf8(string).map_err(ValueEncodingError::InvalidUtf8).unwrap()
    }

    fn get_decimal(&mut self, pos: usize) -> Decimal {
        let (offset, _) = self.get_offset_and_len(pos);
        let bytes = &self.var_len[offset..];
        deserialize_decimal(bytes).unwrap()
    }

    fn get_interval(&mut self, pos: usize) -> IntervalUnit {
        let (offset, _) = self.get_offset_and_len(pos);
        let bytes = &self.var_len[offset..];
        deserialize_interval(bytes).unwrap()
    }

    fn get_naivetime(&mut self, pos: usize) -> NaiveTimeWrapper {
        let (offset, _) = self.get_offset_and_len(pos);
        let bytes = &self.var_len[offset..];
        deserialize_naivetime(bytes).unwrap()
    }

    fn get_naivedatetime(&mut self, pos: usize) -> NaiveDateTimeWrapper {
        let (offset, _) = self.get_offset_and_len(pos);
        let bytes = &self.var_len[offset..];
        deserialize_naivedatetime(bytes).unwrap()
    }

    fn get_struct(&mut self, pos: usize, data_type: DataType) -> StructValue {
        let (offset, _) = self.get_offset_and_len(pos);
        let bytes = &self.var_len[offset..];
        deserialize_struct_or_list(data_type, bytes).unwrap()
    }


}
