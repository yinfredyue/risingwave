from grafanalib.core import (
    Dashboard, TimeSeries,
    Target, GridPos, RowPanel, Time
)
import logging

datasource = {
    "type": "prometheus",
    "uid": "risedev-prometheus"
}


class Layout:
    def __init__(self):
        self.x = 0
        self.y = 0
        self.w = 0
        self.h = 0

    def next_row(self):
        self.y += self.h
        self.x = 0
        self.w = 24
        self.h = 1
        (x, y) = (self.x, self.y)
        return GridPos(h=1, w=24, x=x, y=y)

    def next_half_width_graph(self):
        if self.x + self.w > 24 - 12:
            self.y += self.h
            self.x = 0
        else:
            self.x += self.w
        (x, y) = (self.x, self.y)
        self.h = 8
        self.w = 12
        return GridPos(h=8, w=12, x=x, y=y)

    def next_one_third_width_graph(self):
        if self.x + self.w > 24 - 8:
            self.y += self.h
            self.x = 0
        else:
            self.x += self.w
        (x, y) = (self.x, self.y)
        self.h = 8
        self.w = 8
        return GridPos(h=8, w=8, x=x, y=y)


class Panels:
    def __init__(self, datasource):
        self.layout = Layout()
        self.datasource = datasource

    def row(self, title):
        gridPos = self.layout.next_row()
        return RowPanel(title=title, gridPos=gridPos)

    def row_collapsed(self, title, panels):
        gridPos = self.layout.next_row()
        return RowPanel(title=title, gridPos=gridPos, collapsed=True, panels=panels)

    def target(self, expr, legendFormat, hide=False):
        return Target(expr=expr, legendFormat=legendFormat, datasource=self.datasource, hide=hide)

    def timeseries(self, title, targets):
        gridPos = self.layout.next_half_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, fillOpacity=10)

    def timeseries_count(self, title, targets, legendCols=["max"]):
        gridPos = self.layout.next_half_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, fillOpacity=10,
                          legendDisplayMode="table", legendPlacement="right", legendCalcs=legendCols)

    def timeseries_percentage(self, title, targets, legendCols=["max"]):
        # Percentage should fall into 0.0-1.0
        gridPos = self.layout.next_half_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, unit="percentunit", fillOpacity=10,
                          legendDisplayMode="table", legendPlacement="right", legendCalcs=legendCols)

    def timeseries_latency(self, title, targets, legendCols=["max"]):
        gridPos = self.layout.next_half_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, unit="s", fillOpacity=10,
                          legendDisplayMode="table", legendPlacement="right", legendCalcs=legendCols)

    def timeseries_actor_latency(self, title, targets, legendCols=["max"]):
        gridPos = self.layout.next_half_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, unit="s", fillOpacity=0,
                          legendDisplayMode="table", legendPlacement="right", legendCalcs=legendCols)

    def timeseries_actor_latency_small(self, title, targets, legendCols=["max"]):
        gridPos = self.layout.next_one_third_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, unit="s", fillOpacity=0,
                          legendDisplayMode="table", legendPlacement="right", legendCalcs=legendCols)
    
    def timeseries_query_per_sec(self, title, targets, legendCols=["max"]):
        gridPos = self.layout.next_half_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, unit="Qps", fillOpacity=10,
                          legendDisplayMode="table", legendPlacement="right", legendCalcs=legendCols)
    
    def timeseries_bytes_per_sec(self, title, targets, legendCols=["max"]):
        gridPos = self.layout.next_half_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, unit="Bps", fillOpacity=10,
                          legendDisplayMode="table", legendPlacement="right", legendCalcs=legendCols)

    def timeseries_bytes(self, title, targets, legendCols=["max"]):
        gridPos = self.layout.next_half_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, unit="bytes", fillOpacity=10,
                          legendDisplayMode="table", legendPlacement="right", legendCalcs=legendCols)

    def timeseries_row(self, title, targets, legendCols=["max"]):
        gridPos = self.layout.next_half_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, unit="row", fillOpacity=10,
                          legendDisplayMode="table", legendPlacement="right", legendCalcs=legendCols)

    def timeseries_ns(self, title, targets, legendCols=["max"]):
        gridPos = self.layout.next_half_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, unit="ns", fillOpacity=10,
                          legendDisplayMode="table", legendPlacement="right", legendCalcs=legendCols)

    def timeseries_kilobytes(self, title, targets, legendCols=["max"]):
        gridPos = self.layout.next_half_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, unit="kbytes", fillOpacity=10,
                          legendDisplayMode="table", legendPlacement="right", legendCalcs=legendCols)

    def timeseries_dollar(self, title, targets, legendCols=["max"]):
        gridPos = self.layout.next_half_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, unit="$", fillOpacity=10,
                          legendDisplayMode="table", legendPlacement="right", legendCalcs=legendCols)

    def timeseries_ops(self, title, targets, legendCols=["max"]):
        gridPos = self.layout.next_half_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, unit="ops", fillOpacity=10,
                          legendDisplayMode="table", legendPlacement="right", legendCalcs=legendCols)

    def timeseries_actor_ops(self, title, targets, legendCols=["max"]):
        gridPos = self.layout.next_half_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, unit="ops", fillOpacity=0,
                          legendDisplayMode="table", legendPlacement="right", legendCalcs=legendCols)

    def timeseries_actor_ops_small(self, title, targets, legendCols=["max"]):
        gridPos = self.layout.next_one_third_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, unit="ops", fillOpacity=0,
                          legendDisplayMode="table", legendPlacement="right", legendCalcs=legendCols)

    def timeseries_rowsps(self, title, targets, legendCols=["max"]):
        gridPos = self.layout.next_half_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, unit="rows/s", fillOpacity=10,
                          legendDisplayMode="table", legendPlacement="right", legendCalcs=legendCols)

    def timeseries_actor_rowsps(self, title, targets):
        gridPos = self.layout.next_half_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, unit="rows/s", fillOpacity=0,
                          legendDisplayMode="table", legendPlacement="right")

    def timeseries_memory(self, title, targets):
        gridPos = self.layout.next_half_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, unit="bytes", fillOpacity=10)

    def timeseries_cpu(self, title, targets):
        gridPos = self.layout.next_half_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, unit="percentunit", fillOpacity=10)

    def timeseries_latency_small(self, title, targets):
        gridPos = self.layout.next_one_third_width_graph()
        return TimeSeries(title=title, targets=targets, gridPos=gridPos, unit="s", fillOpacity=10)

    def sub_panel(self):
        return Panels(self.datasource)


panels = Panels(datasource)

logging.basicConfig(level=logging.WARN)


def section_cluster_node(panels):
    return [
        panels.row("Cluster Node"),
        panels.timeseries_count("Node Count", [
            panels.target(
                "sum(node_num) by (node_type)", "{{node_type}}"
            )], ["last"]),
        panels.timeseries_memory("Node Memory", [
            panels.target(
                "avg(process_resident_memory_bytes) by (job,instance)", "{{job}} @ {{instance}}"
            )]),
        panels.timeseries_cpu("Node CPU", [
            panels.target(
                "sum(rate(process_cpu_seconds_total[$__rate_interval])) by (job,instance)", "{{job}} @ {{instance}}"
            )]),
    ]


def section_compaction(outer_panels):
    panels = outer_panels.sub_panel()
    return [
        outer_panels.row_collapsed("Compaction", [
            panels.timeseries_count("SST Count", [
                panels.target(
                    "sum(storage_level_sst_num) by (instance, level_index)", "L{{level_index}}"
                ),
            ]),
            panels.timeseries_kilobytes("KBs level sst", [
                panels.target(
                    "sum(storage_level_total_file_size) by (instance, level_index)", "L{{level_index}}"
                ),
            ]),
            panels.timeseries_count("Compaction Success & Failure Count", [
                panels.target(
                    "sum(storage_level_compact_frequency) by (instance, group, result)", "{{instance}} - {{result}} - group-{{group}}"
                ),
            ]),

            panels.timeseries_count("Compactor Running Task Count", [
                panels.target(
                    "avg(storage_compact_task_pending_num) by(job, instance)", "compactor_task_split_count - {{job}} @ {{instance}}"
                ),
            ]),

            panels.timeseries_latency("Compaction Duration", [
                panels.target(
                    "histogram_quantile(0.5, sum(rate(state_store_compact_task_duration_bucket[$__rate_interval])) by (le, job, instance))", "compact-task p50 - {{job}} @ {{instance}}"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(rate(state_store_compact_task_duration_bucket[$__rate_interval])) by (le, job, instance))", "compact-task p90 - {{job}} @ {{instance}}"
                ),
                panels.target(
                    "sum by(le)(rate(state_store_compact_task_duration_sum[$__rate_interval])) / sum by(le) (rate(state_store_compact_task_duration_count[$__rate_interval]))", "compact-task avg"
                ),
                panels.target(
                    "sum by(le)(rate(state_store_compact_sst_duration_sum[$__rate_interval])) / sum by(le) (rate(state_store_compact_sst_duration_count[$__rate_interval]))", "compact-key-range avg"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(rate(state_store_compact_sst_duration_bucket[$__rate_interval])) by (le, job, instance))", "compact-key-range p90 - {{job}} @ {{instance}}"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(rate(state_store_get_table_id_total_time_duration_bucket[$__rate_interval])) by (le, job, instance))", "get-table-id p90 {{job}} @ {{instance}}"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(rate(state_store_remote_read_time_per_task_bucket[$__rate_interval])) by (le, job, instance))", "remote-io p90 - {{job}} @ {{instance}}"
                ),
            ]),
            panels.timeseries_bytes_per_sec("Compaction Throughput", [
                panels.target(
                    "sum(rate(storage_level_compact_read_next[$__rate_interval])) by(job,instance) + sum(rate("
                    "storage_level_compact_read_curr[$__rate_interval])) by(job,instance)",
                    "read - {{job}} @ {{instance}}"
                ),
                panels.target(
                    "sum(rate(storage_level_compact_write[$__rate_interval])) by(job,instance)", "write - {{job}} @ {{instance}}"
                ),
                panels.target(
                    "sum(rate(state_store_write_build_l0_bytes[$__rate_interval]))by (job,instance)", "flush - {{job}} @ {{instance}}"
                ),
            ]),
            panels.timeseries_count("Compacting SST Count", [
                panels.target(
                    "storage_level_compact_cnt", "L{{level_index}}"
                ),
            ]),
            panels.timeseries_bytes_per_sec("KBs Read from Next Level", [
                panels.target(
                    "sum(rate(storage_level_compact_read_next[$__rate_interval])) by (le, level_index)", "L{{level_index}} read"
                ),
            ]),
            panels.timeseries_bytes_per_sec("KBs Read from Current Level", [
                panels.target(
                    "sum(rate(storage_level_compact_read_curr[$__rate_interval])) by (le, level_index)", "L{{level_index}} read"
                ),
            ]),
            panels.timeseries_ops("Count of SSTs Read from Current Level", [
                panels.target(
                    "sum(rate(storage_level_compact_read_sstn_curr[$__rate_interval])) by (le, level_index)", "L{{level_index}} read"
                ),
            ]),
            panels.timeseries_bytes_per_sec("KBs Written to Next Level", [
                panels.target(
                    "sum(rate(storage_level_compact_write[$__rate_interval])) by (le, level_index)", "L{{level_index}} write"
                ),
            ]),
            panels.timeseries_ops("Count of SSTs Written to Next Level", [
                panels.target(
                    "sum(rate(storage_level_compact_write_sstn[$__rate_interval])) by (le, level_index)", "L{{level_index}} write"
                ),
            ]),
            panels.timeseries_ops("Count of SSTs Read from Next Level", [
                panels.target(
                    "sum(rate(storage_level_compact_read_sstn_next[$__rate_interval])) by (le, level_index)", "L{{level_index}} read"
                ),
            ]),
            panels.timeseries_bytes("Hummock Version Size", [
                panels.target(
                    "version_size", "version size"
                ),
            ]),

            panels.timeseries_bytes("Hummock Sstable BloomFilter Size", [
                panels.target(
                    "sum by(le, job, instance)(rate(state_store_sstable_bloom_filter_size_sum[$__rate_interval]))  / sum by(le, job, instance)(rate(state_store_sstable_bloom_filter_size_count[$__rate_interval]))", "avg  - {{job}} @ {{instance}}"
                ),
            ]),

            panels.timeseries_bytes("Hummock Sstable Meta Size", [
                panels.target(
                    "sum by(le, job, instance)(rate(state_store_sstable_meta_size_sum[$__rate_interval]))  / sum by(le, job, instance)(rate(state_store_sstable_meta_size_count[$__rate_interval]))", "avg  - {{job}} @ {{instance}}"
                ),
            ]),
        ])
    ]


def section_object_storage(outer_panels):
    panels = outer_panels.sub_panel()
    return [
        outer_panels.row_collapsed("Object Storage", [
            panels.timeseries_bytes_per_sec("Operation Throughput", [
                panels.target(
                    "sum(rate(object_store_read_bytes[$__rate_interval]))by(job,instance)", "read - {{job}} @ {{instance}}"
                ),
                panels.target(
                    "sum(rate(object_store_write_bytes[$__rate_interval]))by(job,instance)", "write - {{job}} @ {{instance}}"
                ),
            ]),
            panels.timeseries_latency("Operation Duration", [
                panels.target(
                    "histogram_quantile(0.5, sum(rate(object_store_operation_latency_bucket[$__rate_interval])) by (le, type))", "{{type}} p50"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(rate(object_store_operation_latency_bucket[$__rate_interval])) by (le, type, job, instance))", "{{type}} p99 - {{job}} @ {{instance}}"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(rate(object_store_operation_latency_bucket[$__rate_interval])) by (le, type, job, instance))", "{{type}} p90 - {{job}} @ {{instance}}"
                ),
                panels.target(
                    "sum by(le, type)(rate(object_store_operation_latency_sum[$__rate_interval])) / sum by(le, type) (rate(object_store_operation_latency_count[$__rate_interval]))", "{{type}} avg"
                ),
            ]),
            panels.timeseries_ops("Operation Rate", [
                panels.target(
                    "sum(rate(object_store_operation_latency_count[$__rate_interval])) by (le, type, job, instance)", "{{type}} - {{job}} @ {{instance}}"
                ),
                panels.target(
                    "sum(rate(object_store_operation_latency_count{type=~'upload|delete'}[$__rate_interval])) by (le, media_type, job, instance)", "{{media_type}}-write - {{job}} @ {{instance}}"
                ),
                panels.target(
                    "sum(rate(object_store_operation_latency_count{type=~'read|readv|list|metadata'}[$__rate_interval])) by (le, media_type, job, instance)", "{{media_type}}-read - {{job}} @ {{instance}}"
                ),

            ]),
            panels.timeseries_bytes("Operation Size", [
                panels.target(
                    "histogram_quantile(0.9, sum(rate(object_store_operation_bytes_bucket[$__rate_interval])) by (le, type))", "{{type}}  p90"
                ),
                panels.target(
                    "histogram_quantile(0.80, sum(rate(object_store_operation_bytes_bucket[$__rate_interval])) by (le, type))", "{{type}} p80"
                ),
            ]),
            panels.timeseries_dollar("Estimated S3 Cost (Realtime)", [
                panels.target(
                    "sum(object_store_read_bytes) * 0.01 / 1000 / 1000 / 1000", "(Cross Region) Data Transfer Cost",
                    True
                ),
                panels.target(
                    "sum(object_store_operation_latency_count{type=~'read|delete'}) * 0.0004 / 1000", "GET + DELETE Request Cost"
                ),
                panels.target(
                    "sum(object_store_operation_latency_count{type='upload'}) * 0.005 / 1000", "PUT Request Cost"
                ),
            ]),
            panels.timeseries_dollar("Estimated S3 Cost (Monthly)", [
                panels.target(
                    "sum(storage_level_total_file_size) by (instance) * 0.023 / 1000 / 1000", "Monthly Storage Cost"
                ),
            ]),
        ])
    ]


def quantile(f, percentiles):
    quantile_map = {
        "50": ["0.5", "50"],
        "90": ["0.9", "90"],
        "99": ["0.99", "99"],
        "999": ["0.999", "999"],
        "max": ["1.0", "max"],
    }
    return list(map(lambda p: f(quantile_map[str(p)][0], quantile_map[str(p)][1]), percentiles))


def section_streaming(panels):
    return [
        panels.row("Streaming"),
        panels.timeseries_count(
            "Barrier Number", [
                panels.target("all_barrier_nums", "all_barrier"),
                panels.target("in_flight_barrier_nums",
                              "in_flight_barrier"),
            ]),
        panels.timeseries_latency(
            "Barrier Send Latency",
            quantile(lambda quantile, legend: panels.target(
                f"histogram_quantile({quantile}, sum(rate(meta_barrier_send_duration_seconds_bucket[$__rate_interval])) by (le))", f"barrier_send_latency_p{legend}"
            ), [50, 90, 99, 999, "max"]) + [
                panels.target(
                    "rate(meta_barrier_send_duration_seconds_sum[$__rate_interval]) / rate(meta_barrier_send_duration_seconds_count[$__rate_interval])", "barrier_send_latency_avg"
                ),
            ]),
        panels.timeseries_latency(
            "Barrier Latency",
            quantile(lambda quantile, legend: panels.target(
                f"histogram_quantile({quantile}, sum(rate(meta_barrier_duration_seconds_bucket[$__rate_interval])) by (le))", f"barrier_latency_p{legend}"
            ), [50, 90, 99, 999, "max"]) + [
                panels.target(
                    "rate(meta_barrier_duration_seconds_sum[$__rate_interval]) / rate(meta_barrier_duration_seconds_count[$__rate_interval])", "barrier_latency_avg"
                ),
            ]),
        panels.timeseries_latency(
            "Barrier In-Flight Latency",
            quantile(lambda quantile, legend: panels.target(
                f"histogram_quantile({quantile}, sum(rate(stream_barrier_inflight_duration_seconds_bucket[$__rate_interval])) by (le))", f"barrier_inflight_latency_p{legend}"
            ), [50, 90, 99, 999, "max"]) + [
                panels.target(
                    "max(sum by(le, instance)(rate(stream_barrier_inflight_duration_seconds_sum[$__rate_interval]))  / sum by(le, instance)(rate(stream_barrier_inflight_duration_seconds_count[$__rate_interval])))", "barrier_inflight_latency_avg"
                ),
            ]),
        panels.timeseries_latency(
            "Barrier Sync Latency",

            quantile(lambda quantile, legend: panels.target(
                f"histogram_quantile({quantile}, sum(rate(stream_barrier_sync_storage_duration_seconds_bucket[$__rate_interval])) by (le,instance))", f"barrier_sync_latency_p{legend}"+" - computer @ {{instance}}"
            ), [50, 90, 99, 999, "max"]) + [
                panels.target(
                    "sum by(le, instance)(rate(stream_barrier_sync_storage_duration_seconds_sum[$__rate_interval]))  / sum by(le, instance)(rate(stream_barrier_sync_storage_duration_seconds_count[$__rate_interval]))", "barrier_sync_latency_avg - computer @ {{instance}}"
                ),
            ]),
        panels.timeseries_latency(
            "Barrier Wait Commit Latency",
            quantile(lambda quantile, legend: panels.target(
                f"histogram_quantile({quantile}, sum(rate(meta_barrier_wait_commit_duration_seconds_bucket[$__rate_interval])) by (le))", f"barrier_wait_commit_latency_p{legend}"
            ), [50, 90, 99, 999, "max"]) + [
                panels.target(
                    "rate(meta_barrier_wait_commit_duration_seconds_sum[$__rate_interval]) / rate(meta_barrier_wait_commit_duration_seconds_count[$__rate_interval])", "barrier_wait_commit_avg"
                ),
            ]),
        panels.timeseries_rowsps("Source Throughput", [
            panels.target(
                "rate(stream_source_output_rows_counts[$__rate_interval])", "source={{source_id}} @ {{instance}}"
            ),
        ]),
        panels.timeseries_rowsps("Source Throughput Per Partition", [
            panels.target(
                "rate(partition_input_count[$__rate_interval])", "actor={{actor_id}} source={{source_id}} partition={{partition}}"
            )
        ]),
    ]


def section_streaming_actors(outer_panels):
    panels = outer_panels.sub_panel()
    return [
        outer_panels.row_collapsed("Streaming Actors", [
            panels.timeseries_actor_rowsps("Executor Throughput", [
                panels.target(
                    "rate(stream_executor_row_count[$__rate_interval]) > 0", "{{actor_id}}->{{executor_id}}"
                ),
            ]),
            panels.timeseries_ns("Actor Sampled Deserialization Time", [
                panels.target(
                    "actor_sampled_deserialize_duration_ns", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_ns("Actor Sampled Serialization Time", [
                panels.target(
                    "actor_sampled_serialize_duration_ns", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_percentage("Actor Backpressure", [
                panels.target(
                    "rate(stream_actor_output_buffer_blocking_duration_ns[$__rate_interval]) / 1000000000", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_percentage("Actor Input Blocking Time Ratio", [
                panels.target(
                    "rate(stream_actor_input_buffer_blocking_duration_ns[$__rate_interval]) / 1000000000", "{{actor_id}}->{{upstream_fragment_id}}"
                ),
            ]),
            panels.timeseries_actor_latency("Actor Barrier Latency", [
                panels.target(
                    "rate(stream_actor_barrier_time[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_actor_latency("Actor Processing Time", [
                panels.target(
                    "rate(stream_actor_processing_time[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_actor_latency("Actor Execution Time", [
                panels.target(
                    "rate(stream_actor_actor_execution_time[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_row("Actor Input Row", [
                panels.target(
                    "rate(stream_actor_in_record_cnt[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_row("Actor Output Row", [
                panels.target(
                    "rate(stream_actor_out_record_cnt[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_actor_latency_small("Tokio: Actor Fast Poll Time", [
                panels.target(
                    "rate(stream_actor_fast_poll_duration[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_actor_ops_small("Tokio: Actor Fast Poll Count", [
                panels.target(
                    "rate(stream_actor_fast_poll_cnt[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_actor_latency_small("Tokio: Actor Fast Poll Avg Time", [
                panels.target(
                    "rate(stream_actor_fast_poll_duration[$__rate_interval]) / rate(stream_actor_fast_poll_cnt[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_actor_latency_small("Tokio: Actor Slow Poll Total Time", [
                panels.target(
                    "rate(stream_actor_slow_poll_duration[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_actor_ops_small("Tokio: Actor Slow Poll Count", [
                panels.target(
                    "rate(stream_actor_slow_poll_cnt[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_actor_latency_small("Tokio: Actor Slow Poll Avg Time", [
                panels.target(
                    "rate(stream_actor_slow_poll_duration[$__rate_interval]) / rate(stream_actor_slow_poll_cnt[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_actor_latency_small("Tokio: Actor Poll Total Time", [
                panels.target(
                    "rate(stream_actor_poll_duration[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_actor_ops_small("Tokio: Actor Poll Count", [
                panels.target(
                    "rate(stream_actor_poll_cnt[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_actor_latency_small("Tokio: Actor Poll Avg Time", [
                panels.target(
                    "rate(stream_actor_poll_duration[$__rate_interval]) / rate(stream_actor_poll_cnt[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_actor_latency_small("Tokio: Actor Idle Total Time", [
                panels.target(
                    "rate(stream_actor_idle_duration[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_actor_ops_small("Tokio: Actor Idle Count", [
                panels.target(
                    "rate(stream_actor_idle_cnt[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_actor_latency_small("Tokio: Actor Idle Avg Time", [
                panels.target(
                    "rate(stream_actor_idle_duration[$__rate_interval]) / rate(stream_actor_idle_cnt[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_actor_latency_small("Tokio: Actor Scheduled Total Time", [
                panels.target(
                    "rate(stream_actor_scheduled_duration[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_actor_ops_small("Tokio: Actor Scheduled Count", [
                panels.target(
                    "rate(stream_actor_scheduled_cnt[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_actor_latency_small("Tokio: Actor Scheduled Avg Time", [
                panels.target(
                    "rate(stream_actor_scheduled_duration[$__rate_interval]) / rate(stream_actor_scheduled_cnt[$__rate_interval]) > 0", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_actor_ops("Join Executor Cache", [
                panels.target(
                    "rate(stream_join_lookup_miss_count[$__rate_interval])", "cache miss {{actor_id}} {{side}}"
                ),
                panels.target(
                    "rate(stream_join_lookup_total_count[$__rate_interval])", "total lookups {{actor_id}} {{side}}"
                ),
            ]),
            panels.timeseries_actor_latency("Join Executor Barrier Align", [
                *quantile(lambda quantile, legend:
                          panels.target(
                              f"histogram_quantile({quantile}, sum(rate(stream_join_barrier_align_duration_bucket[$__rate_interval])) by (le, actor_id, wait_side, job, instance))", f"p{legend} {{{{actor_id}}}}.{{{{wait_side}}}} - {{{{job}}}} @ {{{{instance}}}}"
                          ),
                          [90, 99, 999, "max"]),
                panels.target(
                    "sum by(le, actor_id, wait_side, job, instance)(rate(stream_join_barrier_align_duration_sum[$__rate_interval])) / sum by(le,actor_id,wait_side,job,instance) (rate(stream_join_barrier_align_duration_count[$__rate_interval]))", "avg {{actor_id}}.{{wait_side}} - {{job}} @ {{instance}}"
                ),
            ]),
            panels.timeseries_percentage("Join Actor Input Blocking Time Ratio", [
                panels.target(
                    "rate(stream_join_actor_input_waiting_duration_ns[$__rate_interval]) / 1000000000", "{{actor_id}}"
                ),
            ]),
            panels.timeseries_count("Join Cached Entries", [
                panels.target(
                    "stream_join_cached_entries", "{{actor_id}} {{side}}"
                ),
            ]),
            panels.timeseries_count("Join Cached Rows", [
                panels.target(
                    "stream_join_cached_rows", "{{actor_id}} {{side}}"
                ),
            ]),
            panels.timeseries_bytes("Join Cached Estimated Size", [
                panels.target(
                    "stream_join_cached_estimated_size", "{{actor_id}} {{side}}"
                ),
            ])
        ])
    ]


def section_streaming_exchange(outer_panels):
    panels = outer_panels.sub_panel()
    return [
        outer_panels.row_collapsed("Streaming Exchange", [
            panels.timeseries_bytes_per_sec("Exchange Send Throughput", [
                panels.target(
                    "rate(stream_exchange_send_size[$__rate_interval])", "{{up_actor_id}}->{{down_actor_id}}"
                ),
            ]),
            panels.timeseries_bytes_per_sec("Exchange Recv Throughput", [
                panels.target(
                    "rate(stream_exchange_recv_size[$__rate_interval])", "{{up_actor_id}}->{{down_actor_id}}"
                ),
            ]),
            panels.timeseries_bytes_per_sec("Fragment Exchange Send Throughput", [
                panels.target(
                    "rate(stream_exchange_frag_send_size[$__rate_interval])", "{{up_fragment_id}}->{{down_fragment_id}}"
                ),
            ]),
            panels.timeseries_bytes_per_sec("Fragment Exchange Recv Throughput", [
                panels.target(
                    "rate(stream_exchange_frag_recv_size[$__rate_interval])", "{{up_fragment_id}}->{{down_fragment_id}}"
                ),
            ]),
        ]),
    ]


def section_batch_exchange(outer_panels):
    panels = outer_panels.sub_panel()
    return [
        outer_panels.row_collapsed("Batch Exchange", [
            panels.timeseries_row("Exchange Recv Row Number", [
                panels.target(
                    "batch_exchange_recv_row_number", "{{query_id}} : {{source_stage_id}}.{{source_task_id}} -> {{target_stage_id}}.{{target_task_id}}"
                ),
            ]),
        ]),
    ]

def frontend(outer_panels):
    panels = outer_panels.sub_panel()
    return [
        outer_panels.row_collapsed("Frontend", [
            panels.timeseries_query_per_sec("Query Per second in Loacl Execution Mode", [
                panels.target(
                    "rate(frontend_query_counter_local_execution[$__rate_interval])",""
                ),
            ]),
            panels.timeseries_latency("Query Average Latency in Local Execution Mode", [
                panels.target(
                    "frontend_latency_local_execution_sum / frontend_latency_local_execution_count",""
                ),
            ]),
        ]),
    ]


def section_hummock(panels):
    return [
        panels.row("Hummock"),
        panels.timeseries_latency("Build and Sync Sstable Duration", [
            panels.target(
                "histogram_quantile(0.5, sum(rate(state_store_shared_buffer_to_l0_duration_bucket[$__rate_interval])) by (le, job, instance))", "p50 - {{job}} @ {{instance}}", True
            ),
            panels.target(
                "histogram_quantile(0.9, sum(rate(state_store_shared_buffer_to_l0_duration_bucket[$__rate_interval])) by (le, job, instance))", "p90 - {{job}} @ {{instance}}", True
            ),
            panels.target(
                "histogram_quantile(0.99, sum(rate(state_store_shared_buffer_to_l0_duration_bucket[$__rate_interval])) by (le, job, instance))", "p99 - {{job}} @ {{instance}}", True
            ),
            panels.target(
                "sum by(le, job, instance) (rate(state_store_shared_buffer_to_l0_duration_sum[$__rate_interval])) / sum by(le, job, instance) (rate(state_store_shared_buffer_to_l0_duration_count[$__rate_interval]))", "avg - {{job}} @ {{instance}}"
            ),
        ]),
        panels.timeseries_ops("Cache Ops", [
            panels.target(
                "sum(rate(state_store_sst_store_block_request_counts[$__rate_interval])) by (job, instance, type)", "{{type}} - {{job}} @ {{instance}}"
            ),
            panels.target(
                "sum(rate(file_cache_get_latency_count[$__rate_interval])) by (instance)", "file cache get @ {{instance}}"
            ),
            panels.target(
                "sum(rate(file_cache_miss[$__rate_interval])) by (instance)", "file cache miss @ {{instance}}"
            ),
            panels.target(
                "sum(rate(file_cache_insert_latency_count[$__rate_interval])) by (instance)", "file cache insert @ {{instance}}"
            ),
            panels.target(
                "sum(rate(file_cache_erase_latency_count[$__rate_interval])) by (instance)", "file cache erase @ {{instance}}"
            ),
        ]),
        panels.timeseries_ops("Read Ops", [
            panels.target(
                "sum(rate(state_store_get_duration_count[$__rate_interval])) by (job,instance)", "get - {{job}} @ {{instance}}"
            ),
            panels.target(
                "sum(rate(state_store_range_scan_duration_count[$__rate_interval])) by (job,instance)", "forward scan - {{job}} @ {{instance}}"
            ),
            panels.target(
                "sum(rate(state_store_range_reverse_scan_duration_count[$__rate_interval])) by (job,instance)", "backward scan - {{job}} @ {{instance}}"
            ),
            panels.target(
                "sum(rate(state_store_get_shared_buffer_hit_counts[$__rate_interval])) by (job,instance)", "shared_buffer hit - {{job}} @ {{instance}}"
            ),
            panels.target(
                "sum(rate(state_store_iter_in_process_counts[$__rate_interval])) by(job,instance)", "iter - {{job}} @ {{instance}}"
            ),
        ]),
        panels.timeseries_latency("Read Duration - Get", [
            panels.target(
                "histogram_quantile(0.50, sum(rate(state_store_get_duration_bucket[$__rate_interval])) by (le, job, instance))", "p50 - {{job}} @ {{instance}}"
            ),
            panels.target(
                "histogram_quantile(0.90, sum(rate(state_store_get_duration_bucket[$__rate_interval])) by (le, job, instance))", "p90 - {{job}} @ {{instance}}"
            ),
            panels.target(
                "histogram_quantile(0.99, sum(rate(state_store_get_duration_bucket[$__rate_interval])) by (le, job, instance))", "p99 - {{job}} @ {{instance}}"
            ),
            panels.target(
                "sum by(le, job, instance)(rate(state_store_get_duration_sum[$__rate_interval])) / sum by(le, job, instance) (rate(state_store_get_duration_count[$__rate_interval]))", "avg - {{job}} @ {{instance}}"
            ),
        ]),
        panels.timeseries_latency("Read Duration - Scan", [
            panels.target(
                "histogram_quantile(0.50, sum(rate(state_store_range_scan_duration_bucket[$__rate_interval])) by (le, job, instance))", "Forward p50 - {{job}} @ {{instance}}"
            ),
            panels.target(
                "histogram_quantile(0.90, sum(rate(state_store_range_scan_duration_bucket[$__rate_interval])) by (le,job, instance))", "Forward p90 - {{job}} @ {{instance}}"
            ),
            panels.target(
                "histogram_quantile(0.99, sum(rate(state_store_range_scan_duration_bucket[$__rate_interval])) by (le, job, instance))", "Forward p99 - {{job}} @ {{instance}}"
            ),
            panels.target(
                "sum by(le, job, instance)(rate(state_store_range_scan_duration_sum[$__rate_interval])) / sum by(le, job,instance) (rate(state_store_range_scan_duration_count[$__rate_interval]))", "Forward avg - {{job}} @ {{instance}}"
            ),
            panels.target(
                "histogram_quantile(0.50, sum(rate(state_store_range_reverse_scan_duration_bucket[$__rate_interval])) by (le, job, instance))", "Backward p50 - {{job}} @ {{instance}}"
            ),
            panels.target(
                "histogram_quantile(0.90, sum(rate(state_store_range_reverse_scan_duration_bucket[$__rate_interval])) by (le, job, instance))", "Backward p90 - {{job}} @ {{instance}}"
            ),
            panels.target(
                "histogram_quantile(0.99, sum(rate(state_store_range_reverse_scan_duration_bucket[$__rate_interval])) by (le, job, instance))", "Backward p99 - {{job}} @ {{instance}}"
            ),
            panels.target(
                "sum by(le, job, instance)(rate(state_store_range_reverse_scan_duration_sum[$__rate_interval])) / sum by(le, job, instance) (rate(state_store_range_reverse_scan_duration_count[$__rate_interval]))", "Backward avg - {{job}} @ {{instance}}"
            ),
        ]),
        panels.timeseries_latency("Read Duration - Iter", [
            *quantile(lambda quantile, legend:
                      panels.target(
                          f"histogram_quantile({quantile}, sum(rate(state_store_iter_duration_bucket[$__rate_interval])) by (le, job, instance))", f"p{legend} - {{{{job}}}} @ {{{{instance}}}}",
                          legend == "max"
                      ),
                      [90, 99, 999, "max"]),
            panels.target(
                "sum by(le, job, instance)(rate(state_store_iter_duration_sum[$__rate_interval])) / sum by(le, job,instance) (rate(state_store_iter_duration_count[$__rate_interval]))", "avg - {{job}} @ {{instance}}"
            ),
        ]),
        panels.timeseries_latency("Read Duration - Iter Pure Scan", [
            *quantile(lambda quantile, legend:
                      panels.target(
                          f"histogram_quantile({quantile}, sum(rate(state_store_iter_scan_duration_bucket[$__rate_interval])) by (le, job, instance))", f"p{legend} - {{{{job}}}} @ {{{{instance}}}}",
                          legend == "max"
                      ),
                      [90, 99, 999, "max"]),
            panels.target(
                "sum by(le, job, instance)(rate(state_store_scan_iter_duration_sum[$__rate_interval])) / sum by(le, job,instance) (rate(state_store_iter_scan_duration_count[$__rate_interval]))", "avg - {{job}} @ {{instance}}"
            ),
        ]),
        panels.timeseries_bytes("Read Item Size - Get", [
            *quantile(lambda quantile, legend:
                      panels.target(
                          f"histogram_quantile({quantile}, sum(rate(state_store_get_key_size_bucket[$__rate_interval])) by (le, job, instance)) + histogram_quantile({quantile}, sum(rate(state_store_get_value_size_bucket[$__rate_interval])) by (le, job, instance))", f"p{legend} - {{{{job}}}} @ {{{{instance}}}}"
                      ),
                      [90, 99, 999]),
        ]),
        panels.timeseries_bytes("Read Item Size - Scan", [
            *quantile(lambda quantile, legend:
                      panels.target(
                          f"histogram_quantile({quantile}, sum(rate(state_store_range_scan_size_bucket[$__rate_interval])) by (le, job, instance))", f"forward scan p{legend} - {{{{job}}}} @ {{{{instance}}}}"
                      ),
                      [90, 99, 999]),
            *quantile(lambda quantile, legend:
                      panels.target(
                          f"histogram_quantile({quantile}, sum(rate(state_store_range_reverse_scan_size_bucket[$__rate_interval])) by (le, job, instance))", f"backward scan p{legend} - {{{{job}}}} @ {{{{instance}}}}"
                      ),
                      [90, 99, 999]),
        ]),
        panels.timeseries_bytes("Read Item Size - Iter", [
            *quantile(lambda quantile, legend:
                      panels.target(
                          f"histogram_quantile({quantile}, sum(rate(state_store_iter_size_bucket[$__rate_interval])) by (le, job, instance))", f"p{legend} - {{{{job}}}} @ {{{{instance}}}}"
                      ),
                      [90, 99, 999]),
        ]),
        panels.timeseries_count("Read Item Count - Iter", [
            *quantile(lambda quantile, legend:
                      panels.target(
                          f"histogram_quantile({quantile}, sum(rate(state_store_iter_item_bucket[$__rate_interval])) by (le, job, instance))", f"p{legend} - {{{{job}}}} @ {{{{instance}}}}"
                      ),
                      [90, 99, 999]),
        ]),
        panels.timeseries_bytes_per_sec("Read Throughput - Get", [
            panels.target(
                "(sum(rate(state_store_get_key_size_sum[$__rate_interval])) by(job, instance) + sum(rate(state_store_get_value_size_sum[$__rate_interval])) by(job, instance)) / " +
                "(sum(rate(state_store_get_key_size_count[$__rate_interval])) by (job, instance) + sum(rate(state_store_get_value_size_count[$__rate_interval])) by (job, instance))", "{{job}} @ {{instance}}"
            ),
        ]),
        panels.timeseries_bytes_per_sec("Read Throughput - Scan", [
            panels.target(
                "sum(rate(state_store_range_scan_size_sum[$__rate_interval])) by(job, instance) / sum(rate(state_store_range_scan_size_count[$__rate_interval])) by (job, instance)", "forward - {{job}} @ {{instance}}"
            ),
            panels.target(
                "sum(rate(state_store_range_reverse_scan_size_sum[$__rate_interval])) by(job, instance) / sum(rate(state_store_range_reverse_scan_size_count[$__rate_interval])) by (job, instance)", "backward - {{job}} @ {{instance}}"
            ),
        ]),
        panels.timeseries_bytes_per_sec("Read Throughput - Iter", [
            panels.target(
                "sum(rate(state_store_iter_size_sum[$__rate_interval])) by(job, instance) / sum(rate(state_store_iter_size_count[$__rate_interval])) by (job, instance)", "{{job}} @ {{instance}}"
            ),
        ]),

        panels.timeseries_ops("Read Bloom Filter", [
            panels.target(
                "sum(rate(state_store_bloom_filter_true_negative_counts[$__rate_interval])) by (job,instance)", "bloom filter true negative  - {{job}} @ {{instance}}"
            ),
            panels.target(
                "sum(rate(state_bloom_filter_check_counts[$__rate_interval])) by (job,instance)", "bloom filter check count  - {{job}} @ {{instance}}"
            ),
        ]),
        panels.timeseries_ops("Iter keys flow", [
            panels.target(
                "sum(rate(state_store_iter_scan_key_counts[$__rate_interval])) by (instance, type)", "iter keys flow - {{type}} @ {{instance}} "
            ),
        ]),
        panels.timeseries_percentage(" Filter-Cache Hit Rate", [
            panels.target(
                "(sum(rate(state_store_bloom_filter_true_negative_counts[$__rate_interval])) by (job,instance)) / (sum(rate(state_bloom_filter_check_counts[$__rate_interval])) by (job,instance))", "bloom filter hit rate - {{job}} @ {{instance}}"
            ),
            panels.target(
                "((sum(rate(state_store_sst_store_block_request_counts{type='meta_total'}[$__rate_interval])) by (job,instance)) - (sum(rate(state_store_sst_store_block_request_counts{type='meta_miss'}[$__rate_interval])) by (job,instance))) / (sum(rate(state_store_sst_store_block_request_counts{type='meta_total'}[$__rate_interval])) by (job,instance))", "meta cache hit rate - {{job}} @ {{instance}}"
            ),
            panels.target(
                "((sum(rate(state_store_sst_store_block_request_counts{type='data_total'}[$__rate_interval])) by (job,instance)) - (sum(rate(state_store_sst_store_block_request_counts{type='data_miss'}[$__rate_interval])) by (job,instance))) / (sum(rate(state_store_sst_store_block_request_counts{type='data_total'}[$__rate_interval])) by (job,instance))", "block cache hit rate - {{job}} @ {{instance}}"
            ),
            panels.target(
                "((sum(rate(file_cache_get_latency_count[$__rate_interval])) by (instance)) - (sum(rate(file_cache_miss[$__rate_interval])) by (instance))) / (sum(rate(file_cache_get_latency_count[$__rate_interval])) by (instance))", "file cache hit rate @ {{instance}}"
            ),
        ]),

        panels.timeseries_count("Read Merged SSTs", [
            panels.target(
                "histogram_quantile(0.9, sum(rate(state_store_iter_merge_sstable_counts_bucket[$__rate_interval])) by (le, job, instance))", "# merged ssts p90  - {{job}} @ {{instance}}", True
            ),
            panels.target(
                "histogram_quantile(0.99, sum(rate(state_store_iter_merge_sstable_counts_bucket[$__rate_interval])) by (le, job, instance))", "# merged ssts p99  - {{job}} @ {{instance}}", True
            ),
            panels.target(
                "sum by(le, job, instance)(rate(state_store_iter_merge_sstable_counts_sum[$__rate_interval]))  / sum by(le, job, instance)(rate(state_store_iter_merge_sstable_counts_count[$__rate_interval]))", "# merged ssts avg  - {{job}} @ {{instance}}"
            ),
        ]),
        panels.timeseries_ops("Write Ops", [
            panels.target(
                "sum(rate(state_store_write_batch_duration_count[$__rate_interval])) by (job,instance)", "write batch - {{job}} @ {{instance}} "
            ),
            panels.target(
                "sum(rate(state_store_shared_buffer_to_l0_duration_count[$__rate_interval])) by (job,instance)", "l0 - {{job}} @ {{instance}} "
            ),
        ]),
        panels.timeseries_latency("Write Duration", [
            panels.target(
                "histogram_quantile(0.5, sum(rate(state_store_write_batch_duration_bucket[$__rate_interval])) by (le, job, instance))", "shared_buffer p50 - {{job}} @ {{instance}}"
            ),
            panels.target(
                "histogram_quantile(0.9, sum(rate(state_store_write_batch_duration_bucket[$__rate_interval])) by (le, job, instance))", "shared_buffer p90 - {{job}} @ {{instance}}"
            ),
            panels.target(
                "histogram_quantile(0.99, sum(rate(state_store_write_batch_duration_bucket[$__rate_interval])) by (le, job, instance))", "shared_buffer p99 - {{job}} @ {{instance}}"
            ),
            panels.target(
                "sum by(le, job, instance)(rate(state_store_write_batch_duration_sum[$__rate_interval]))  / sum by(le, job, instance)(rate(state_store_write_batch_duration_count[$__rate_interval]))", "shared_buffer avg - {{job}} @ {{instance}}"
            ),
            panels.target(
                "histogram_quantile(0.5, sum(rate(state_store_write_shared_buffer_sync_time_bucket[$__rate_interval])) by (le, job, instance))", "sync_remote p50 - {{job}} @ {{instance}}"
            ),
            panels.target(
                "histogram_quantile(0.9, sum(rate(state_store_write_shared_buffer_sync_time_bucket[$__rate_interval])) by (le, job, instance))", "sync_remote p90 - {{job}} @ {{instance}}"
            ),
            panels.target(
                "histogram_quantile(0.99, sum(rate(state_store_write_shared_buffer_sync_time_bucket[$__rate_interval])) by (le, job, instance))", "sync_remote p99 - {{job}} @ {{instance}}"
            ),
            panels.target(
                "sum by(le, job, instance)(rate(state_store_write_shared_buffer_sync_time_sum[$__rate_interval]))  / sum by(le, job, instance)(rate(state_store_write_shared_buffer_sync_time_count[$__rate_interval]))", "sync_remote avg - {{job}} @ {{instance}}"
            ),
        ]),

        panels.timeseries_ops("Write Item Count", [
            panels.target(
                "sum(rate(state_store_write_batch_tuple_counts[$__rate_interval])) by (job,instance)", "write_batch_kv_pair_count - {{instance}} "
            ),
        ]),
        panels.timeseries_bytes_per_sec("Write Throughput", [
            panels.target(
                "sum(rate(state_store_write_batch_size_sum[$__rate_interval]))by(job,instance) / sum(rate(state_store_write_batch_size_count[$__rate_interval]))by(job,instance)", "shared_buffer - {{job}} @ {{instance}}"
            ),
            panels.target(
                "sum(rate(state_store_shared_buffer_to_sstable_size_sum[$__rate_interval]))by(job,instance) / sum(rate(state_store_shared_buffer_to_sstable_size_count[$__rate_interval]))by(job,instance)", "sync - {{job}} @ {{instance}}"
            ),
        ]),
        panels.timeseries_bytes("Checkpoint Sync Size", [
            panels.target(
                "sum by(le, job, instance) (rate(state_store_write_l0_size_per_epoch_sum[$__rate_interval])) / sum by(le, job, instance) (rate(state_store_write_l0_size_per_epoch_count[$__rate_interval]))", "avg - {{job}} @ {{instance}}"
            ),
        ]),
        panels.timeseries_bytes("Cache Size", [
            panels.target(
                "avg(state_store_meta_cache_size) by (job,instance)", "meta cache - {{job}} @ {{instance}}"
            ),
            panels.target(
                "avg(state_store_block_cache_size) by (job,instance)", "data cache - {{job}} @ {{instance}}"
            ),
            panels.target(
                "sum(state_store_limit_memory_size) by (job)", "uploading memory - {{job}}"
            ),
        ]),
        panels.timeseries_latency("Row SeqScan Next Duration", [
            panels.target(
                "histogram_quantile(0.5, sum(rate(batch_row_seq_scan_next_duration_bucket[$__rate_interval])) by (le, job, instance))", "row_seq_scan next p50 - {{job}} @ {{instance}}", True
            ),
            panels.target(
                "histogram_quantile(0.9, sum(rate(batch_row_seq_scan_next_duration_bucket[$__rate_interval])) by (le, job, instance))", "p90 - {{job}} @ {{instance}}", True
            ),
            panels.target(
                "histogram_quantile(0.99, sum(rate(batch_row_seq_scan_next_duration_bucket[$__rate_interval])) by (le, job, instance))", "p99 - {{job}} @ {{instance}}", True
            ),
            panels.target(
                "sum by(le, job, instance) (rate(batch_row_seq_scan_next_duration_sum[$__rate_interval])) / sum by(le, job, instance) (rate(batch_row_seq_scan_next_duration_count[$__rate_interval]))", "row_seq_scan next avg - {{job}} @ {{instance}}"
            ),
        ]),
    ]


def section_hummock_tiered_cache(outer_panels):
    panels = outer_panels.sub_panel()
    return [
        outer_panels.row_collapsed("Hummock Tiered Cache", [
            panels.timeseries_ops("Ops", [
                panels.target(
                    "sum(rate(file_cache_get_latency_count[$__rate_interval])) by (instance)", "file cache get @ {{instance}}"
                ),
                panels.target(
                    "sum(rate(file_cache_miss[$__rate_interval])) by (instance)", "file cache miss @ {{instance}}"
                ),
                panels.target(
                    "sum(rate(file_cache_insert_latency_count[$__rate_interval])) by (instance)", "file cache insert @ {{instance}}"
                ),
                panels.target(
                    "sum(rate(file_cache_erase_latency_count[$__rate_interval])) by (instance)", "file cache erase @ {{instance}}"
                ),
                panels.target(
                    "sum(rate(file_cache_disk_read_latency_count[$__rate_interval])) by (instance)", "file cache disk read @ {{instance}}"
                ),
                panels.target(
                    "sum(rate(file_cache_disk_write_latency_count[$__rate_interval])) by (instance)", "file cache disk write @ {{instance}}"
                ),
            ]),
            panels.timeseries_latency("Latency", [
                panels.target(
                    "histogram_quantile(0.5, sum(rate(file_cache_get_latency_bucket[$__rate_interval])) by (le, instance))", "p50 - file cache get @ {{instance}}"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(rate(file_cache_get_latency_bucket[$__rate_interval])) by (le, instance))", "p90 - file cache get @ {{instance}}"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(rate(file_cache_get_latency_bucket[$__rate_interval])) by (le, instance))", "p99 - file cache get @ {{instance}}"
                ),
                panels.target(
                    "histogram_quantile(0.5, sum(rate(file_cache_insert_latency_bucket[$__rate_interval])) by (le, instance))", "p50 - file cache insert @ {{instance}}"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(rate(file_cache_insert_latency_bucket[$__rate_interval])) by (le, instance))", "p90 - file cache insert @ {{instance}}"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(rate(file_cache_insert_latency_bucket[$__rate_interval])) by (le, instance))", "p99 - file cache insert @ {{instance}}"
                ),
                panels.target(
                    "histogram_quantile(0.5, sum(rate(file_cache_erase_latency_bucket[$__rate_interval])) by (le, instance))", "p50 - file cache erase @ {{instance}}"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(rate(file_cache_erase_latency_bucket[$__rate_interval])) by (le, instance))", "p90 - file cache erase @ {{instance}}"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(rate(file_cache_erase_latency_bucket[$__rate_interval])) by (le, instance))", "p99 - file cache erase @ {{instance}}"
                ),
                panels.target(
                    "histogram_quantile(0.5, sum(rate(file_cache_disk_read_latency_bucket[$__rate_interval])) by (le, instance))", "p50 - file cache disk read @ {{instance}}"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(rate(file_cache_disk_read_latency_bucket[$__rate_interval])) by (le, instance))", "p90 - file cache disk read @ {{instance}}"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(rate(file_cache_disk_read_latency_bucket[$__rate_interval])) by (le, instance))", "p99 - file cache disk read @ {{instance}}"
                ),
                panels.target(
                    "histogram_quantile(0.5, sum(rate(file_cache_disk_write_latency_bucket[$__rate_interval])) by (le, instance))", "p50 - file cache disk write @ {{instance}}"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(rate(file_cache_disk_write_latency_bucket[$__rate_interval])) by (le, instance))", "p90 - file cache disk write @ {{instance}}"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(rate(file_cache_disk_write_latency_bucket[$__rate_interval])) by (le, instance))", "p99 - file cache disk write @ {{instance}}"
                ),
            ]),
            panels.timeseries_bytes_per_sec("Throughput", [
                panels.target(
                    "sum(rate(file_cache_disk_read_throughput[$__rate_interval])) by (instance)", "disk read @ {{instance}}"
                ),
                panels.target(
                    "sum(rate(file_cache_disk_write_throughput[$__rate_interval])) by (instance)", "disk write @ {{instance}}"
                ),
            ]),
        ])
    ]


def section_hummock_manager(outer_panels):
    panels = outer_panels.sub_panel()
    return [
        outer_panels.row_collapsed("Hummock Manager", [
            panels.timeseries_latency("Lock Time", [
                panels.target(
                    "histogram_quantile(0.50, sum(rate(hummock_manager_lock_time_bucket[$__rate_interval])) by (le, lock_name, lock_type))", "Lock Time p50 - {{lock_type}} {{lock_name}}"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(rate(hummock_manager_lock_time_bucket[$__rate_interval])) by (le, lock_name, lock_type))", "Lock Time p99 - {{lock_type}} {{lock_name}}"
                ),
                panels.target(
                    "histogram_quantile(0.999, sum(rate(hummock_manager_lock_time_bucket[$__rate_interval])) by (le, lock_name, lock_type))", "Lock Time p999 - {{lock_type}} {{lock_name}}"
                ),
            ]),
            panels.timeseries_latency("Real Process Time", [
                panels.target(
                    "histogram_quantile(0.50, sum(rate(meta_hummock_manager_real_process_time_bucket[$__rate_interval])) by (le, method))", "Real Process Time P50 - {{method}}"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(rate(meta_hummock_manager_real_process_time_bucket[$__rate_interval])) by (le, method))", "Real Process Time P99 - {{method}}"
                ),
                panels.target(
                    "histogram_quantile(0.999, sum(rate(meta_hummock_manager_real_process_time_bucket[$__rate_interval])) by (le, method))", "Real Process Time P999 - {{method}}"
                ),
            ]),
        ])
    ]


def section_grpc_meta_catalog_service(outer_panels):
    panels = outer_panels.sub_panel()
    return [
        outer_panels.row_collapsed("gRPC Meta: Catalog Service", [
            panels.timeseries_latency_small("create latency", [
                panels.target(
                    "histogram_quantile(0.5, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.CatalogService/Create\"}[$__rate_interval])) by (le))", "Create_p50"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.CatalogService/Create\"}[$__rate_interval])) by (le))", "Create_p90"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.CatalogService/Create\"}[$__rate_interval])) by (le))", "Create_p99"
                ),
                panels.target(
                    "sum(irate(meta_grpc_duration_seconds_sum{path=\"/meta.CatalogService/Create\"}[$__rate_interval])) / sum(irate(meta_grpc_duration_seconds_count{path=\"/meta.CatalogService/Create\"}[$__rate_interval]))", "Create_avg"
                ),
            ]),
            panels.timeseries_latency_small("drop latency", [
                panels.target(
                    "histogram_quantile(0.5, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.CatalogService/Drop\"}[$__rate_interval])) by (le))", "Drop_p50"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.CatalogService/Drop\"}[$__rate_interval])) by (le))", "Drop_p90"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.CatalogService/Drop\"}[$__rate_interval])) by (le))", "Drop_p99"
                ),
                panels.target(
                    "sum(irate(meta_grpc_duration_seconds_sum{path=\"/meta.CatalogService/Drop\"}[$__rate_interval])) / sum(irate(meta_grpc_duration_seconds_count{path=\"/meta.CatalogService/Drop\"}[$__rate_interval]))", "Drop_avg"
                ),
            ]),
            panels.timeseries_latency_small("get catalog latency", [
                panels.target(
                    "histogram_quantile(0.5, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.CatalogService/GetCatalog\"}[$__rate_interval])) by (le))", "GetCatalog_p50"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.CatalogService/GetCatalog\"}[$__rate_interval])) by (le))", "GetCatalog_p90"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.CatalogService/GetCatalog\"}[$__rate_interval])) by (le))", "GetCatalog_p99"
                ),
                panels.target(
                    "sum(irate(meta_grpc_duration_seconds_sum{path=\"/meta.CatalogService/GetCatalog\"}[$__rate_interval])) / sum(irate(meta_grpc_duration_seconds_count{path=\"/meta.CatalogService/GetCatalog\"}[$__rate_interval]))", "GetCatalog_avg"
                ),
            ]),
        ])
    ]


def section_grpc_meta_cluster_service(outer_panels):
    panels = outer_panels.sub_panel()
    return [
        outer_panels.row_collapsed("gRPC Meta: Cluster Service", [
            panels.timeseries_latency_small("add worker node latency", [
                panels.target(
                    "histogram_quantile(0.5, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.ClusterService/AddWorkerNode\"}[$__rate_interval])) by (le))", "AddWorkerNode_p50"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.ClusterService/AddWorkerNode\"}[$__rate_interval])) by (le))", "AddWorkerNode_p90"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.ClusterService/AddWorkerNode\"}[$__rate_interval])) by (le))", "AddWorkerNode_p99"
                ),
                panels.target(
                    "sum(irate(meta_grpc_duration_seconds_sum{path=\"/meta.ClusterService/AddWorkerNode\"}[$__rate_interval])) / sum(irate(meta_grpc_duration_seconds_count{path=\"/meta.ClusterService/AddWorkerNode\"}[$__rate_interval]))", "AddWorkerNode_avg"
                ),
            ]),
            panels.timeseries_latency_small("list all node latency", [
                panels.target(
                    "histogram_quantile(0.5, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.ClusterService/ListAllNodes\"}[$__rate_interval])) by (le))", "ListAllNodes_p50"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.ClusterService/ListAllNodes\"}[$__rate_interval])) by (le))", "ListAllNodes_p90"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.ClusterService/ListAllNodes\"}[$__rate_interval])) by (le))", "ListAllNodes_p99"
                ),
                panels.target(
                    "sum(irate(meta_grpc_duration_seconds_sum{path=\"/meta.ClusterService/ListAllNodes\"}[$__rate_interval])) / sum(irate(meta_grpc_duration_seconds_count{path=\"/meta.ClusterService/ListAllNodes\"}[$__rate_interval]))", "ListAllNodes_avg"
                ),
            ]),
        ]),
    ]


def section_grpc_meta_stream_manager(outer_panels):
    panels = outer_panels.sub_panel()
    return [
        outer_panels.row_collapsed("gRPC Meta: Stream Manager", [
            panels.timeseries_latency_small("create materialized view latency", [
                panels.target(
                    "histogram_quantile(0.5, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.StreamManagerService/CreateMaterializedView\"}[$__rate_interval])) by (le))", "CreateMaterializedView_p50"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.StreamManagerService/CreateMaterializedView\"}[$__rate_interval])) by (le))", "CreateMaterializedView_p90"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.StreamManagerService/CreateMaterializedView\"}[$__rate_interval])) by (le))", "CreateMaterializedView_p99"
                ),
                panels.target(
                    "sum(irate(meta_grpc_duration_seconds_sum{path=\"/meta.StreamManagerService/CreateMaterializedView\"}[$__rate_interval])) / sum(irate(meta_grpc_duration_seconds_count{path=\"/meta.StreamManagerService/CreateMaterializedView\"}[$__rate_interval]))", "CreateMaterializedView_avg"
                ),
            ]),
            panels.timeseries_latency_small("drop materialized view latency", [
                panels.target(
                    "histogram_quantile(0.5, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.StreamManagerService/DropMaterializedView\"}[$__rate_interval])) by (le))", "DropMaterializedView_p50"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.StreamManagerService/DropMaterializedView\"}[$__rate_interval])) by (le))", "DropMaterializedView_p90"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.StreamManagerService/DropMaterializedView\"}[$__rate_interval])) by (le))", "DropMaterializedView_p99"
                ),
                panels.target(
                    "sum(irate(meta_grpc_duration_seconds_sum{path=\"/meta.StreamManagerService/DropMaterializedView\"}[$__rate_interval])) / sum(irate(meta_grpc_duration_seconds_count{path=\"/meta.StreamManagerService/DropMaterializedView\"}[$__rate_interval]))", "DropMaterializedView_avg"
                ),
            ]),
            panels.timeseries_latency_small("flush latency", [
                panels.target(
                    "histogram_quantile(0.5, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.StreamManagerService/Flush\"}[$__rate_interval])) by (le))", "Flush_p50"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.StreamManagerService/Flush\"}[$__rate_interval])) by (le))", "Flush_p90"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/meta.StreamManagerService/Flush\"}[$__rate_interval])) by (le))", "Flush_p99"
                ),
                panels.target(
                    "sum(irate(meta_grpc_duration_seconds_sum{path=\"/meta.StreamManagerService/Flush\"}[$__rate_interval])) / sum(irate(meta_grpc_duration_seconds_count{path=\"/meta.StreamManagerService/Flush\"}[$__rate_interval]))", "Flush_avg"
                ),
            ]),
        ]),
    ]


def section_grpc_meta_hummock_manager(outer_panels):
    panels = outer_panels.sub_panel()
    return [
        outer_panels.row_collapsed("gRPC Meta: Hummock Manager", [
            panels.timeseries_latency_small("version latency", [
                panels.target(
                    "histogram_quantile(0.5, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/hummock.HummockManagerService/UnpinVersion\"}[$__rate_interval])) by (le))", "UnpinVersion_p50"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/hummock.HummockManagerService/UnpinVersion\"}[$__rate_interval])) by (le))", "UnpinVersion_p90"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/hummock.HummockManagerService/UnpinVersion\"}[$__rate_interval])) by (le))", "UnpinVersion_p99"
                ),
                panels.target(
                    "sum(irate(meta_grpc_duration_seconds_sum{path=\"/hummock.HummockManagerService/UnpinVersion\"}[$__rate_interval])) / sum(irate(meta_grpc_duration_seconds_count{path=\"/hummock.HummockManagerService/UnpinVersion\"}[$__rate_interval]))", "UnpinVersion_avg"
                ),
                panels.target(
                    "histogram_quantile(0.5, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/hummock.HummockManagerService/PinVersion\"}[$__rate_interval])) by (le))", "PinVersion_p50"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/hummock.HummockManagerService/PinVersion\"}[$__rate_interval])) by (le))", "PinVersion_p90"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/hummock.HummockManagerService/PinVersion\"}[$__rate_interval])) by (le))", "PinVersion_p99"
                ),
                panels.target(
                    "sum(irate(meta_grpc_duration_seconds_sum{path=\"/hummock.HummockManagerService/PinVersion\"}[$__rate_interval])) / sum(irate(meta_grpc_duration_seconds_count{path=\"/hummock.HummockManagerService/PinVersion\"}[$__rate_interval]))", "PinVersion_avg"
                ),
            ]),
            panels.timeseries_latency_small("snapshot latency", [
                panels.target(
                    "histogram_quantile(0.5, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/hummock.HummockManagerService/UnpinSnapshot\"}[$__rate_interval])) by (le))", "UnpinSnapshot_p50"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/hummock.HummockManagerService/UnpinSnapshot\"}[$__rate_interval])) by (le))", "UnpinSnapshot_p90"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/hummock.HummockManagerService/UnpinSnapshot\"}[$__rate_interval])) by (le))", "UnpinSnapshot_p99"
                ),
                panels.target(
                    "sum(irate(meta_grpc_duration_seconds_sum{path=\"/hummock.HummockManagerService/UnpinSnapshot\"}[$__rate_interval])) / sum(irate(meta_grpc_duration_seconds_count{path=\"/hummock.HummockManagerService/UnpinSnapshot\"}[$__rate_interval]))", "UnpinSnapshot_avg"
                ),
                panels.target(
                    "histogram_quantile(0.5, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/hummock.HummockManagerService/PinSnapshot\"}[$__rate_interval])) by (le))", "PinSnapshot_p50"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/hummock.HummockManagerService/PinSnapshot\"}[$__rate_interval])) by (le))", "PinSnapshot_p90"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/hummock.HummockManagerService/PinSnapshot\"}[$__rate_interval])) by (le))", "PinSnapshot_p99"
                ),
                panels.target(
                    "sum(irate(meta_grpc_duration_seconds_sum{path=\"/hummock.HummockManagerService/PinSnapshot\"}[$__rate_interval])) / sum(irate(meta_grpc_duration_seconds_count{path=\"/hummock.HummockManagerService/PinSnapshot\"}[$__rate_interval]))", "PinSnapshot_avg"
                ),
            ]),
            panels.timeseries_latency_small("compaction latency", [
                panels.target(
                    "histogram_quantile(0.5, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/hummock.HummockManagerService/ReportCompactionTasks\"}[$__rate_interval])) by (le))", "ReportCompactionTasks_p50"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/hummock.HummockManagerService/ReportCompactionTasks\"}[$__rate_interval])) by (le))", "ReportCompactionTasks_p90"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/hummock.HummockManagerService/ReportCompactionTasks\"}[$__rate_interval])) by (le))", "ReportCompactionTasks_p99"
                ),
                panels.target(
                    "sum(irate(meta_grpc_duration_seconds_sum{path=\"/hummock.HummockManagerService/ReportCompactionTasks\"}[$__rate_interval])) / sum(irate(meta_grpc_duration_seconds_count{path=\"/hummock.HummockManagerService/ReportCompactionTasks\"}[$__rate_interval]))", "ReportCompactionTasks_avg"
                ),
            ]),
            panels.timeseries_latency_small("SST Id latency", [
                panels.target(
                    "histogram_quantile(0.5, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/hummock.HummockManagerService/GetNewSstIds\"}[$__rate_interval])) by (le))", "GetNewSstIds_p50"
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/hummock.HummockManagerService/GetNewSstIds\"}[$__rate_interval])) by (le))", "GetNewSstIds_p90"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(meta_grpc_duration_seconds_bucket{path=\"/hummock.HummockManagerService/GetNewSstIds\"}[$__rate_interval])) by (le))", "GetNewSstIds_p99"
                ),
                panels.target(
                    "sum(irate(meta_grpc_duration_seconds_sum{path=\"/hummock.HummockManagerService/GetNewSstIds\"}[$__rate_interval])) / sum(irate(meta_grpc_duration_seconds_count{path=\"/hummock.HummockManagerService/GetNewSstIds\"}[$__rate_interval]))", "GetNewSstIds_avg"
                ),
            ]),
        ]),
    ]


def section_grpc_hummock_meta_client(outer_panels):
    panels = outer_panels.sub_panel()
    return [
        outer_panels.row_collapsed("gRPC: Hummock Meta Client", [
            panels.timeseries_count("compaction_count", [
                panels.target(
                    "sum(irate(state_store_report_compaction_task_counts[$__rate_interval])) by(job,instance)", "report_compaction_task_counts - {{instance}} "
                ),
            ]),
            panels.timeseries_latency("version_latency", [
                panels.target(
                    "histogram_quantile(0.5, sum(irate(state_store_pin_version_latency_bucket[$__rate_interval])) by (le, job, instance))", "pin_version_latency_p50 - {{instance}} "
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(state_store_pin_version_latency_bucket[$__rate_interval])) by (le, job, instance))", "pin_version_latency_p99 - {{instance}} "
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(irate(state_store_pin_version_latency_bucket[$__rate_interval])) by (le, job, instance))", "pin_version_latencyp90 - {{instance}} "
                ),
                panels.target(
                    "sum(irate(state_store_pin_version_latency_sum[$__rate_interval])) / sum(irate(state_store_pin_version_latency_count[$__rate_interval]))", "pin_version_latency_avg"
                ),
                panels.target(
                    "histogram_quantile(0.5, sum(irate(state_store_unpin_version_latency_bucket[$__rate_interval])) by (le, job, instance))", "unpin_version_latency_p50 - {{instance}} "
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(state_store_unpin_version_latency_bucket[$__rate_interval])) by (le, job, instance))", "unpin_version_latency_p99 - {{instance}} "
                ),
                panels.target(
                    "sum(irate(state_store_unpin_version_latency_sum[$__rate_interval])) / sum(irate(state_store_unpin_version_latency_count[$__rate_interval]))", "unpin_version_latency_avg"
                ),
                panels.target(
                    "histogram_quantile(0.90, sum(irate(state_store_unpin_version_latency_bucket[$__rate_interval])) by (le, job, instance))", "unpin_version_latency_p90 - {{instance}} "
                ),
            ]),
            panels.timeseries_count("version_count", [
                panels.target(
                    "sum(irate(state_store_pin_version_counts[$__rate_interval])) by(job,instance)", "pin_version_counts - {{instance}} "
                ),
                panels.target(
                    "sum(irate(state_store_unpin_version_counts[$__rate_interval])) by(job,instance)", "unpin_version_counts - {{instance}} "
                ),
            ]),
            panels.timeseries_latency("snapshot_latency", [
                panels.target(
                    "histogram_quantile(0.5, sum(irate(state_store_pin_snapshot_latency_bucket[$__rate_interval])) by (le, job, instance))", "pin_snapshot_latency_p50 - {{instance}} "
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(state_store_pin_snapshot_latency_bucket[$__rate_interval])) by (le, job, instance))", "pin_snapshot_latency_p99 - {{instance}} "
                ),
                panels.target(
                    "histogram_quantile(0.9, sum(irate(state_store_pin_snapshot_latency_bucket[$__rate_interval])) by (le, job, instance))", "pin_snapshot_latencyp90 - {{instance}} "
                ),
                panels.target(
                    "sum(irate(state_store_pin_snapshot_latency_sum[$__rate_interval])) / sum(irate(state_store_pin_snapshot_latency_count[$__rate_interval]))", "pin_snapshot_latency_avg"
                ),
                panels.target(
                    "histogram_quantile(0.5, sum(irate(state_store_unpin_version_snapshot_bucket[$__rate_interval])) by (le, job, instance))", "unpin_snapshot_latency_p50 - {{instance}} "
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(state_store_unpin_version_snapshot_bucket[$__rate_interval])) by (le, job, instance))", "unpin_snapshot_latency_p99 - {{instance}} "
                ),
                panels.target(
                    "sum(irate(state_store_unpin_snapshot_latency_sum[$__rate_interval])) / sum(irate(state_store_unpin_snapshot_latency_count[$__rate_interval]))", "unpin_snapshot_latency_avg"
                ),
                panels.target(
                    "histogram_quantile(0.90, sum(irate(state_store_unpin_snapshot_latency_bucket[$__rate_interval])) by (le, job, instance))", "unpin_snapshot_latency_p90 - {{instance}} "
                ),
            ]),
            panels.timeseries_count("snapshot_count", [
                panels.target(
                    "sum(irate(state_store_pin_snapshot_counts[$__rate_interval])) by(job,instance)", "pin_snapshot_counts - {{instance}} "
                ),
                panels.target(
                    "sum(irate(state_store_unpin_snapshot_counts[$__rate_interval])) by(job,instance)", "unpin_snapshot_counts - {{instance}} "
                ),
            ]),
            panels.timeseries_latency("table_latency", [
                panels.target(
                    "histogram_quantile(0.5, sum(irate(state_store_get_new_sst_ids_latency_bucket[$__rate_interval])) by (le, job, instance))", "get_new_sst_ids_latency_latency_p50 - {{instance}} "
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(state_store_get_new_sst_ids_latency_bucket[$__rate_interval])) by (le, job, instance))", "get_new_sst_ids_latency_latency_p99 - {{instance}} "
                ),
                panels.target(
                    "sum(irate(state_store_get_new_sst_ids_latency_sum[$__rate_interval])) / sum(irate(state_store_get_new_sst_ids_latency_count[$__rate_interval]))", "get_new_sst_ids_latency_latency_avg"
                ),
                panels.target(
                    "histogram_quantile(0.90, sum(irate(state_store_get_new_sst_ids_latency_bucket[$__rate_interval])) by (le, job, instance))", "get_new_sst_ids_latency_latency_p90 - {{instance}} "
                ),
            ]),
            panels.timeseries_count("table_count", [
                panels.target(
                    "sum(irate(state_store_get_new_sst_ids_latency_counts[$__rate_interval]))by(job,instance)", "get_new_sst_ids_latency_counts - {{instance}} "
                ),
            ]),
            panels.timeseries_latency("compaction_latency", [
                panels.target(
                    "histogram_quantile(0.5, sum(irate(state_store_report_compaction_task_latency_bucket[$__rate_interval])) by (le, job, instance))", "report_compaction_task_latency_p50 - {{instance}}"
                ),
                panels.target(
                    "histogram_quantile(0.99, sum(irate(state_store_report_compaction_task_latency_bucket[$__rate_interval])) by (le, job, instance))", "report_compaction_task_latency_p99 - {{instance}}"
                ),
                panels.target(
                    "sum(irate(state_store_report_compaction_task_latency_sum[$__rate_interval])) / sum(irate(state_store_report_compaction_task_latency_count[$__rate_interval]))", "report_compaction_task_latency_avg"
                ),
                panels.target(
                    "histogram_quantile(0.90, sum(irate(state_store_report_compaction_task_latency_bucket[$__rate_interval])) by (le, job, instance))", "report_compaction_task_latency_p90 - {{instance}}"
                ),
            ]),
        ]),
    ]


dashboard = Dashboard(
    title="risingwave_dashboard",
    description="RisingWave Dashboard",
    tags=[
        'risingwave'
    ],
    timezone="browser",
    editable=True,
    uid="Ecy3uV1nz",
    time=Time(start="now-30m", end="now"),
    sharedCrosshair=True,
    panels=[
        *section_cluster_node(panels),
        *section_streaming(panels),
        *section_streaming_actors(panels),
        *section_streaming_exchange(panels),
        *section_batch_exchange(panels),
        *section_hummock(panels),
        *section_compaction(panels),
        *section_object_storage(panels),
        *section_hummock_tiered_cache(panels),
        *section_hummock_manager(panels),
        *section_grpc_meta_catalog_service(panels),
        *section_grpc_meta_cluster_service(panels),
        *section_grpc_meta_stream_manager(panels),
        *section_grpc_meta_hummock_manager(panels),
        *section_grpc_hummock_meta_client(panels),
        *frontend(panels),
    ],
).auto_panel_ids()
