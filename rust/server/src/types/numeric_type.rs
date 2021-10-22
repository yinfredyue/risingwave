use crate::array::{ArrayBuilder, ArrayBuilderImpl, PrimitiveArrayBuilder};
use crate::error::Result;
use crate::error::RwError;
use crate::types::DataSize;
use crate::types::DataType;
use crate::types::DataTypeKind;
use crate::types::DataTypeRef;
use crate::types::PrimitiveDataType;
use risingwave_proto::data::DataType as DataTypeProto;
use risingwave_proto::data::DataType_TypeName;
use std::any::Any;
use std::convert::TryFrom;
use std::default::Default;
use std::mem::size_of;
use std::sync::Arc;

macro_rules! make_numeric_type {
    ($name:ident, $native_ty:ty, $data_ty:expr, $proto_ty: expr) => {
        #[derive(Debug, Eq, PartialEq)]
        pub struct $name {
            nullable: bool,
        }

        impl $name {
            pub fn new(nullable: bool) -> Self {
                Self { nullable }
            }

            pub fn create(nullable: bool) -> DataTypeRef {
                Arc::new(Self::new(nullable))
            }
        }

        impl Default for $name {
            fn default() -> Self {
                Self { nullable: false }
            }
        }

        impl DataType for $name {
            fn data_type_kind(&self) -> DataTypeKind {
                $data_ty
            }

            fn is_nullable(&self) -> bool {
                self.nullable
            }

            fn create_array_builder(self: Arc<Self>, capacity: usize) -> Result<ArrayBuilderImpl> {
                Ok(PrimitiveArrayBuilder::<$native_ty>::new(capacity)?.into())
            }

            fn to_protobuf(&self) -> Result<DataTypeProto> {
                let mut proto = DataTypeProto::new();
                proto.set_type_name($proto_ty);
                proto.set_is_nullable(self.nullable);
                Ok(proto)
            }

            fn as_any(&self) -> &dyn Any {
                self
            }

            fn data_size(&self) -> DataSize {
                DataSize::Fixed(size_of::<$native_ty>())
            }
        }

        impl PrimitiveDataType for $name {
            const DATA_TYPE_KIND: DataTypeKind = $data_ty;
            type N = $native_ty;
        }

        impl<'a> TryFrom<&'a DataTypeProto> for $name {
            type Error = RwError;

            fn try_from(proto: &'a DataTypeProto) -> Result<Self> {
                ensure!(proto.get_type_name() == $proto_ty);
                Ok(Self {
                    nullable: proto.is_nullable,
                })
            }
        }
    };
}

make_numeric_type!(
    Int16Type,
    i16,
    DataTypeKind::Int16,
    DataType_TypeName::INT16
);
make_numeric_type!(
    Int32Type,
    i32,
    DataTypeKind::Int32,
    DataType_TypeName::INT32
);
make_numeric_type!(
    Int64Type,
    i64,
    DataTypeKind::Int64,
    DataType_TypeName::INT64
);
make_numeric_type!(
    Float32Type,
    f32,
    DataTypeKind::Float32,
    DataType_TypeName::FLOAT
);
make_numeric_type!(
    Float64Type,
    f64,
    DataTypeKind::Float64,
    DataType_TypeName::DOUBLE
);
make_numeric_type!(DateType, i32, DataTypeKind::Date, DataType_TypeName::DATE);
