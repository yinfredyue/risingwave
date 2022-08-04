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

//! This is implemented for getting typed value from a slice.
//! Diffrent from [`bytes::Buf`] that those api will not advance the pointer.

use std::mem;

macro_rules! get_impl {
    ($src:ident, $typ:tt::$conv:tt) => {{
        const SIZE: usize = mem::size_of::<$typ>();
        unsafe { $typ::$conv(*($src as *const _ as *const [_; SIZE])) }
    }};
}

pub(super) fn get_u8_le(src: &mut [u8]) -> u8 {
    get_impl!(src, u8::from_le_bytes)
}

pub(super) fn get_i16_le(src: &mut [u8]) -> i16 {
    get_impl!(src, i16::from_le_bytes)
}

pub(super) fn get_i32_le(src: &mut [u8]) -> i32 {
    get_impl!(src, i32::from_le_bytes)
}

pub(super) fn get_i64_le(src: &mut [u8]) -> i64 {
    get_impl!(src, i64::from_le_bytes)
}

pub(super) fn get_f32_le(src: &mut [u8]) -> f32 {
    get_impl!(src, f32::from_le_bytes)
}

pub(super) fn get_f64_le(src: &mut [u8]) -> f64 {
    get_impl!(src, f64::from_le_bytes)
}

pub(super) fn get_u64_le(src: &mut [u8]) -> u64 {
    get_impl!(src, u64::from_le_bytes)
}
