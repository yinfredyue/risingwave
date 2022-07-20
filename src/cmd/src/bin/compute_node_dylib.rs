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

use libloading::library_filename;
use risingwave_rt::runtime_okk;
use tokio::runtime::Runtime;

type StartFn = fn(rt: *const Runtime);

fn main() {
    risingwave_rt::init_risingwave_logger(risingwave_rt::LoggerSettings::new(false, false));

    let rt = runtime_okk();

    unsafe {
        let mylib = Box::leak(Box::new(
            libloading::Library::new(library_filename("risingwave_compute")).unwrap(),
        ));
        let start_fn = mylib.get::<StartFn>(b"start_dylib").unwrap();

        start_fn(&rt);
    }
}
