#!/usr/bin/env python3
"""Convert a differential expression TSV into a Plotly volcano plot JSON."""

import argparse
import csv
import json
import math
from pathlib import Path


STATUS_STYLE = {
    "Up": "#d62728",
    "Down": "#1f77b4",
    "Not significant": "#8a8f98",
}


def parse_args():
    parser = argparse.ArgumentParser(
        description="Convert DE results to a Plotly-ready volcano plot JSON."
    )
    parser.add_argument("input", help="Input TSV with gene, log2FC, and p-value columns.")
    parser.add_argument("output", help="Output Plotly JSON path.")
    parser.add_argument("--title", default="Volcano plot", help="Plot title.")
    parser.add_argument("--gene-column", default="genes", help="Gene name column.")
    parser.add_argument(
        "--lfc-column", default="log2FoldChange", help="log2 fold-change column."
    )
    parser.add_argument(
        "--padj-column", default="padj", help="Adjusted p-value column."
    )
    parser.add_argument("--pvalue-column", default="pvalue", help="Raw p-value column.")
    parser.add_argument(
        "--basemean-column", default="baseMean", help="Mean expression column."
    )
    parser.add_argument(
        "--lfc-threshold",
        type=float,
        default=1.0,
        help="Absolute log2FC threshold for significance.",
    )
    parser.add_argument(
        "--padj-threshold",
        type=float,
        default=0.05,
        help="Adjusted p-value threshold for significance.",
    )
    parser.add_argument(
        "--point-size", type=float, default=5.0, help="Marker size for each gene."
    )
    return parser.parse_args()


def to_float(value):
    if value is None or value == "":
        return None
    try:
        number = float(value)
    except ValueError:
        return None
    if not math.isfinite(number):
        return None
    return number


def read_de_rows(path):
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle, delimiter="\t")
        header = next(reader)
        for row in reader:
            if not row:
                continue
            if len(row) == len(header) + 1:
                row_header = ["rowname"] + header
            elif len(row) == len(header):
                row_header = header
            else:
                raise ValueError(
                    f"Expected {len(header)} or {len(header) + 1} columns, "
                    f"found {len(row)} in row starting with {row[0]!r}"
                )
            yield dict(zip(row_header, row))


def classify_gene(log2fc, padj, lfc_threshold, padj_threshold):
    if padj is None or padj >= padj_threshold:
        return "Not significant"
    if log2fc >= lfc_threshold:
        return "Up"
    if log2fc <= -lfc_threshold:
        return "Down"
    return "Not significant"


def add_threshold_shapes(layout, lfc_threshold, padj_threshold):
    y_threshold = -math.log10(padj_threshold)
    layout["shapes"] = [
        {
            "type": "line",
            "xref": "x",
            "yref": "paper",
            "x0": -lfc_threshold,
            "x1": -lfc_threshold,
            "y0": 0,
            "y1": 1,
            "line": {"color": "#777", "width": 1, "dash": "dash"},
        },
        {
            "type": "line",
            "xref": "x",
            "yref": "paper",
            "x0": lfc_threshold,
            "x1": lfc_threshold,
            "y0": 0,
            "y1": 1,
            "line": {"color": "#777", "width": 1, "dash": "dash"},
        },
        {
            "type": "line",
            "xref": "paper",
            "yref": "y",
            "x0": 0,
            "x1": 1,
            "y0": y_threshold,
            "y1": y_threshold,
            "line": {"color": "#777", "width": 1, "dash": "dash"},
        },
    ]


def build_figure(args):
    groups = {
        status: {"x": [], "y": [], "text": [], "customdata": []}
        for status in STATUS_STYLE
    }
    min_positive_p = 1e-300

    for row in read_de_rows(Path(args.input)):
        gene = row.get(args.gene_column) or row.get("rowname") or ""
        log2fc = to_float(row.get(args.lfc_column))
        padj = to_float(row.get(args.padj_column))
        pvalue = to_float(row.get(args.pvalue_column))
        basemean = to_float(row.get(args.basemean_column))

        if log2fc is None or padj is None:
            continue

        clamped_padj = max(padj, min_positive_p)
        neg_log10_padj = -math.log10(clamped_padj)
        status = classify_gene(
            log2fc, padj, args.lfc_threshold, args.padj_threshold
        )

        groups[status]["x"].append(log2fc)
        groups[status]["y"].append(neg_log10_padj)
        groups[status]["text"].append(gene)
        groups[status]["customdata"].append(
            [
                None if padj is None else float(padj),
                None if pvalue is None else float(pvalue),
                None if basemean is None else float(basemean),
            ]
        )

    traces = []
    for status in ["Down", "Not significant", "Up"]:
        group = groups[status]
        traces.append(
            {
                "type": "scattergl",
                "mode": "markers",
                "name": status,
                "x": group["x"],
                "y": group["y"],
                "text": group["text"],
                "customdata": group["customdata"],
                "marker": {
                    "color": STATUS_STYLE[status],
                    "size": args.point_size,
                    "opacity": 0.75,
                },
                "hovertemplate": (
                    "Gene: %{text}"
                    "<br>log2FC: %{x:.3f}"
                    "<br>-log10 padj: %{y:.3f}"
                    "<br>padj: %{customdata[0]:.3e}"
                    "<br>pvalue: %{customdata[1]:.3e}"
                    "<br>baseMean: %{customdata[2]:.3f}"
                    "<extra>%{fullData.name}</extra>"
                ),
            }
        )

    layout = {
        "title": {"text": args.title},
        "xaxis": {
            "title": {"text": "log2 fold change"},
            "zeroline": True,
        },
        "yaxis": {
            "title": {"text": "-log10 adjusted p-value"},
            "rangemode": "tozero",
        },
        "legend": {"orientation": "h", "y": 1.08},
        "hovermode": "closest",
        "margin": {"l": 70, "r": 30, "t": 80, "b": 70},
    }
    add_threshold_shapes(layout, args.lfc_threshold, args.padj_threshold)

    return {
        "data": traces,
        "layout": layout,
        "config": {
            "responsive": True,
            "displaylogo": False,
            "toImageButtonOptions": {"format": "svg"},
        },
    }


def main():
    args = parse_args()
    figure = build_figure(args)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(figure, handle, separators=(",", ":"))
        handle.write("\n")


if __name__ == "__main__":
    main()
