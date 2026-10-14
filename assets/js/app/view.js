import { BAND_META } from "../stats.js";
import { t } from "../i18n.js";
import { dom, state } from "./state.js";
import {
    escapeHtml,
    formatGeneratedAt,
    formatGotDifficultyFromNumeric,
    formatNumber,
    formatPercent,
    formatSigned,
    getBeatmapDownloadUrl,
    getMapSearchUrl,
    hasValidBid,
    normalizeSubPattern,
} from "./utils.js";
import { getWinnerLabel } from "./model.js";

export function setStatus(message, level) {
    dom.statusBadge.className = `badge ${level}`;
    dom.statusBadge.textContent = message;
}

export function setDatasetInfo(text) {
    dom.datasetInfo.textContent = text;
}

export function setCompareUiVisible(visible) {
    if (dom.comparePanel) {
        dom.comparePanel.classList.toggle("hidden", !visible);
    }

    const compareCells = document.querySelectorAll(".compare-col");
    compareCells.forEach((cell) => {
        cell.classList.toggle("hidden", !visible);
    });

    if (dom.resultTable) {
        dom.resultTable.classList.toggle("has-compare", visible);
    }

    if (!visible && ["compareGot", "compareDeltaAbs", "better"].includes(state.sortKey)) {
        state.sortKey = "deltaAbs";
        state.sortDirection = "asc";
        updateSortVisual();
    }
}

export function setFieldVisible(field, visible) {
    if (!field) {
        return;
    }
    field.classList.toggle("hidden", !visible);
}

export function updateSourceHint(extra = "") {
    let remoteCount = 0;
    let localCount = 0;

    for (const descriptor of state.catalog.values()) {
        if (descriptor.source === "local") {
            localCount += 1;
        } else {
            remoteCount += 1;
        }
    }

    const segments = [];
    if (remoteCount > 0) {
        segments.push(t("index.meta.sourceRemoteCount", "Remote {count}", { count: remoteCount }));
    }
    if (localCount > 0) {
        segments.push(t("index.meta.sourceLocalCount", "Local {count}", { count: localCount }));
    }
    if (!segments.length) {
        segments.push(t("index.meta.sourceNone", "No Datasets"));
    }

    const suffix = extra ? ` | ${extra}` : "";
    dom.sourceHint.textContent = t("index.meta.sourceHint", "Source: {segments}{suffix}", {
        segments: segments.join(" + "),
        suffix,
    });
}

export function renderAlgorithmOptions() {
    const previous = state.currentAlgorithm;

    dom.algorithmSelect.innerHTML = "";

    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "";
    dom.algorithmSelect.appendChild(emptyOption);

    for (const algorithm of state.algorithms) {
        const option = document.createElement("option");
        option.value = algorithm;
        option.textContent = algorithm;
        dom.algorithmSelect.appendChild(option);
    }

    if (!state.algorithms.length) {
        state.currentAlgorithm = "";
        dom.algorithmSelect.value = "";
        return;
    }

    if (previous && state.algorithms.includes(previous)) {
        state.currentAlgorithm = previous;
    } else {
        state.currentAlgorithm = "";
    }

    dom.algorithmSelect.value = state.currentAlgorithm || "";
}

export function renderCompareOptions() {
    const previous = state.compareAlgorithm;
    dom.compareAlgorithmSelect.innerHTML = "";

    const offOption = document.createElement("option");
    offOption.value = "";
    offOption.textContent = t("common.off", "Off");
    dom.compareAlgorithmSelect.appendChild(offOption);

    const candidates = state.algorithms.filter((algorithm) => algorithm !== state.currentAlgorithm);
    for (const algorithm of candidates) {
        const option = document.createElement("option");
        option.value = algorithm;
        option.textContent = algorithm;
        dom.compareAlgorithmSelect.appendChild(option);
    }

    if (previous && candidates.includes(previous)) {
        state.compareAlgorithm = previous;
    } else {
        state.compareAlgorithm = "";
    }

    dom.compareAlgorithmSelect.value = state.compareAlgorithm;
}

export function renderAlgorithmSelectors() {
    renderAlgorithmOptions();
    renderCompareOptions();
}

export function fillPatternFilter(rows) {
    const previous = dom.patternFilter.value;
    const patterns = [...new Set(rows.map((row) => String(row.pattern || "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    dom.patternFilter.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = t("common.all", "All");
    dom.patternFilter.appendChild(allOption);

    for (const pattern of patterns) {
        const option = document.createElement("option");
        option.value = pattern;
        option.textContent = pattern;
        dom.patternFilter.appendChild(option);
    }

    dom.patternFilter.value = patterns.includes(previous) ? previous : "all";
}

export function fillSubPatternFilter(rows) {
    const previous = dom.subPatternFilter.value;
    const subPatterns = [...new Set(rows.map((row) => normalizeSubPattern(row.subPattern)).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    dom.subPatternFilter.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = t("common.all", "All");
    dom.subPatternFilter.appendChild(allOption);

    for (const subPattern of subPatterns) {
        const option = document.createElement("option");
        option.value = subPattern;
        option.textContent = subPattern;
        dom.subPatternFilter.appendChild(option);
    }

    dom.subPatternFilter.value = subPatterns.includes(previous) ? previous : "all";
}

export function updateSummary(summary) {
    dom.totalMapsValue.textContent = String(summary.totalRows);
    dom.validMapsValue.textContent = String(summary.validRows);

    dom.maeValue.textContent = formatNumber(summary.metrics.mae, 2);
    dom.rmseValue.textContent = formatNumber(summary.metrics.rmse, 2);
    dom.biasValue.textContent = formatSigned(summary.metrics.bias, 2);
    dom.medianValue.textContent = formatNumber(summary.metrics.medianAbs, 2);
    dom.coverageValue.textContent = formatPercent(summary.metrics.coverage);
    dom.p90Value.textContent = formatNumber(summary.metrics.p90Abs, 2);
    dom.maxUnderrateValue.textContent = formatSigned(summary.metrics.maxUnderrate, 2);
    dom.maxOverrateValue.textContent = formatSigned(summary.metrics.maxOverrate, 2);

    dom.exactRateValue.textContent = formatPercent(summary.bandRates.exact);
    dom.closeRateValue.textContent = formatPercent(summary.bandRates.close);
    dom.moderateRateValue.textContent = formatPercent(summary.bandRates.moderate);
    dom.missRateValue.textContent = formatPercent(summary.bandRates.miss);

    dom.exactCountValue.textContent = t("index.kpi.mapsCount", "{count} maps", { count: summary.bandCounts.exact });
    dom.closeCountValue.textContent = t("index.kpi.mapsCount", "{count} maps", { count: summary.bandCounts.close });
    dom.moderateCountValue.textContent = t("index.kpi.mapsCount", "{count} maps", { count: summary.bandCounts.moderate });
    dom.missCountValue.textContent = t("index.kpi.mapsCount", "{count} maps", { count: summary.bandCounts.miss });

    if (dom.trendFitValue) {
        const value = summary.metrics.trendFitPercent;
        dom.trendFitValue.textContent = Number.isFinite(value)
            ? t("index.charts.trend.fit", "Fit: {value}%", { value: Number(value).toFixed(2) })
            : t("index.charts.trend.fitEmpty", "Fit: -");
    }
}

function renderInsightList(target, rows, direction) {
    if (!rows.length) {
        target.innerHTML = `<li class="insight-empty">${escapeHtml(t("index.insight.empty", "No maps with valid values."))}</li>`;
        return;
    }

    target.innerHTML = rows
        .map((row, index) => {
            const sign = direction === "positive" ? "+" : "";
            const deltaFormatted = `${sign}${formatNumber(row.delta, 2)}`;
            const deltaBadgeClass = direction === "positive" ? "delta-underrated" : "delta-overrated";
            return [
                `<li class="insight-card">`,
                `<div class="insight-card-top">`,
                `<span class="insight-rank">#${index + 1}</span>`,
                `<span class="insight-name" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</span>`,
                `<span class="insight-delta ${deltaBadgeClass}">${deltaFormatted}</span>`,
                `</div>`,
                `<div class="insight-card-bottom">`,
                `<span class="insight-pattern-tag">${escapeHtml(row.pattern || "-")}</span>`,
                `<span class="insight-meta">${escapeHtml(t("index.insight.detail", "delta {delta} | expected {expected} | got {got}", {
                    delta: deltaFormatted,
                    expected: formatNumber(row.expected, 2),
                    got: formatNumber(row.got, 2),
                }))}</span>`,
                `</div>`,
                `</li>`,
            ].join("");
        })
        .join("");
}

export function updateInsightLists(summary) {
    renderInsightList(dom.underratedList, summary.topUnderrated, "positive");
    renderInsightList(dom.overratedList, summary.topOverrated, "negative");
}

export function updateCompareSummary(compareSummary) {
    if (!state.compareAlgorithm || !compareSummary) {
        dom.compareStatusText.textContent = t("index.compare.disabled", "Comparison disabled.");
        dom.compareMatchedValue.textContent = "-";
        dom.compareBaseWinsValue.textContent = "-";
        dom.compareOtherWinsValue.textContent = "-";
        dom.compareTieValue.textContent = "-";
        dom.compareAgreementValue.textContent = "-";
        dom.compareMaeGapValue.textContent = "-";
        return;
    }

    dom.compareStatusText.textContent = t(
        "index.compare.status",
        "{base}[{baseScope}] vs {compare}[{compareScope}]",
        {
            base: state.currentAlgorithm,
            baseScope: state.baseMode,
            compare: state.compareAlgorithm,
            compareScope: state.compareMode,
        },
    );
    dom.compareMatchedValue.textContent = String(compareSummary.matchedRows);
    dom.compareBaseWinsValue.textContent = String(compareSummary.baseWins);
    dom.compareOtherWinsValue.textContent = String(compareSummary.compareWins);
    dom.compareTieValue.textContent = String(compareSummary.tieCount);
    dom.compareAgreementValue.textContent = formatPercent(compareSummary.agreementRate);
    dom.compareMaeGapValue.textContent = formatSigned(compareSummary.maeGap, 2);
}

export function renderErrorPanel(rows) {
    const errors = rows
        .filter((row) => Boolean(row._errorInfo))
        .map((row) => ({
            ...row,
            errorType: row._errorInfo.type,
            errorDetail: row._errorInfo.detail,
            errorRaw: row._errorInfo.raw,
        }));

    state.errorRows = errors;

    let invalidCount = 0;
    let failedCount = 0;
    let missingCount = 0;

    for (const row of errors) {
        if (row.errorType === "Invalid") {
            invalidCount += 1;
        } else if (row.errorType === "Missing") {
            missingCount += 1;
        } else {
            failedCount += 1;
        }
    }

    dom.errorInvalidCount.textContent = String(invalidCount);
    dom.errorFailedCount.textContent = String(failedCount);
    dom.errorMissingCount.textContent = String(missingCount);

    if (!errors.length) {
        dom.errorStatusText.textContent = t("index.errors.noneInScope", "No error maps in current algorithm scope.");
        dom.errorTableBody.innerHTML = "";
        dom.errorEmptyState.hidden = false;
        return;
    }

    dom.errorStatusText.textContent = t(
        "index.errors.countInScope",
        "{count} error maps in current algorithm scope.",
        { count: errors.length },
    );
    dom.errorEmptyState.hidden = true;

    dom.errorTableBody.innerHTML = errors
        .map((row) => {
            const rowClass = String(row.errorType || "Failed").toLowerCase();
            const expectedText = String(row.expectedRaw || "").trim() || formatNumber(row.expected);
            const detailText = String(row.errorDetail || "").trim();
            const compactDetail = detailText.length > 120
                ? `${detailText.slice(0, 117)}...`
                : detailText;
            return [
                `<tr class="error-${rowClass}">`,
                `<td>${escapeHtml(row.name)}</td>`,
                `<td>${escapeHtml(row.pattern)}</td>`,
                `<td>${escapeHtml(row._normalizedSubPattern || normalizeSubPattern(row.subPattern))}</td>`,
                `<td>${escapeHtml(expectedText)}</td>`,
                `<td>${escapeHtml(row.errorType)}</td>`,
                `<td>${escapeHtml(compactDetail)}</td>`,
                "</tr>",
            ].join("");
        })
        .join("");
}

const TABLE_BATCH_SIZE = 60;
const tableLazyState = {
    rows: [],
    rendered: 0,
};
let tableObserver = null;

function renderRowHtml(row) {
    const bandKey = row._band || "error";
    const bandLabel = bandKey === "error"
        ? t("index.errors.errorBand", "Error")
        : t(`band.${bandKey}`, BAND_META[bandKey]?.label || "Miss");
    const winnerLabel = getWinnerLabel(row.better, Boolean(state.compareAlgorithm));
    const winnerClass = row.better || "na";
    const hasBid = hasValidBid(row);
    const searchUrl = getMapSearchUrl(row.name);
    const downloadUrl = hasBid ? getBeatmapDownloadUrl(row.bid) : "";

    const gotValue = row.got;
    const gotText = Number.isFinite(gotValue)
        ? formatGotDifficultyFromNumeric(gotValue, row.pattern)
        : (String(row.gotRaw || "").trim() || "-");
    const gotNumericText = Number.isFinite(gotValue) ? formatNumber(gotValue) : "";

    const compareGotValue = row.compareGot;
    const compareGotText = Number.isFinite(compareGotValue)
        ? formatNumber(compareGotValue)
        : (String(row.compareGotRaw || "").trim() || "-");

    const compareHiddenClass = state.compareAlgorithm ? "" : " hidden";

    return [
        `<tr class="band-${bandKey}${bandKey === "error" ? " map-error" : ""}">`,
        `<td class="cell-name" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</td>`,
        `<td class="num">${formatNumber(row.expected)}</td>`,
        Number.isFinite(gotValue)
            ? `<td class="got-cell has-hover-value"><span class="got-label">${escapeHtml(gotText)}</span><span class="got-number">${escapeHtml(gotNumericText)}</span></td>`
            : `<td class="got-cell">${escapeHtml(gotText)}</td>`,
        `<td class="num">${formatSigned(row.delta)}</td>`,
        `<td class="num">${formatNumber(row.deltaAbs)}</td>`,
        `<td>${escapeHtml(row.pattern)}</td>`,
        `<td>${escapeHtml(row._normalizedSubPattern || normalizeSubPattern(row.subPattern))}</td>`,
        `<td class="band"><span class="band-pill band-${bandKey}">${bandLabel}</span></td>`,
        `<td class="compare-col${compareHiddenClass}">${escapeHtml(compareGotText)}</td>`,
        `<td class="num compare-col${compareHiddenClass}">${formatNumber(row.compareDeltaAbs)}</td>`,
        `<td class="winner ${winnerClass} compare-col${compareHiddenClass}">${escapeHtml(winnerLabel)}</td>`,
        `<td class="actions-col"><div class="row-actions"><a class="icon-btn" href="${escapeHtml(searchUrl)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(t("index.table.actions.search", "Search beatmapsets"))}">🔎</a>${hasBid
            ? `<a class="icon-btn" href="${escapeHtml(downloadUrl)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(t("index.table.actions.download", "Download .osu"))}">⬇</a>`
            : `<span class="icon-btn disabled" title="${escapeHtml(t("index.table.actions.noBid", "No bid"))}">⬇</span>`}</div></td>`,
        "</tr>",
    ].join("");
}

function updateLazySentinel() {
    let sentinel = document.getElementById("tableLazySentinel");
    if (!sentinel) {
        sentinel = document.createElement("div");
        sentinel.id = "tableLazySentinel";
        sentinel.className = "table-lazy-sentinel";
        dom.resultTable.insertAdjacentElement("afterend", sentinel);
        sentinel.addEventListener("click", () => {
            renderMoreTableRows();
        });
    }

    if (tableLazyState.rows.length === 0) {
        sentinel.hidden = true;
        return;
    }

    sentinel.hidden = false;
    if (tableLazyState.rendered >= tableLazyState.rows.length) {
        sentinel.classList.remove("has-more");
        sentinel.classList.add("all-loaded");
        sentinel.textContent = t("index.table.lazyLoadAll", "All {total} maps loaded", {
            total: tableLazyState.rows.length,
        });
    } else {
        sentinel.classList.add("has-more");
        sentinel.classList.remove("all-loaded");
        sentinel.textContent = t("index.table.lazyLoadMore", "Scroll down to load more ({rendered} / {total})...", {
            rendered: tableLazyState.rendered,
            total: tableLazyState.rows.length,
        });
    }
}

export function renderMoreTableRows(batchSize = TABLE_BATCH_SIZE) {
    if (tableLazyState.rendered >= tableLazyState.rows.length) {
        updateLazySentinel();
        return;
    }

    const nextBatch = tableLazyState.rows.slice(
        tableLazyState.rendered,
        tableLazyState.rendered + batchSize,
    );
    if (nextBatch.length === 0) {
        return;
    }

    const chunkHtml = nextBatch.map(renderRowHtml).join("");
    dom.resultTableBody.insertAdjacentHTML("beforeend", chunkHtml);
    tableLazyState.rendered += nextBatch.length;
    updateLazySentinel();
}

function ensureTableObserver() {
    const tableWrap = dom.resultTable.closest(".table-wrap");
    if (!tableWrap) {
        return;
    }

    if (!tableWrap._lazyScrollBound) {
        tableWrap._lazyScrollBound = true;
        tableWrap.addEventListener("scroll", () => {
            if (tableLazyState.rendered < tableLazyState.rows.length) {
                if (tableWrap.scrollTop + tableWrap.clientHeight >= tableWrap.scrollHeight - 240) {
                    renderMoreTableRows();
                }
            }
        }, { passive: true });
    }

    if ("IntersectionObserver" in window && !tableObserver) {
        tableObserver = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting && tableLazyState.rendered < tableLazyState.rows.length) {
                    renderMoreTableRows();
                }
            }
        }, {
            root: tableWrap,
            rootMargin: "250px",
            threshold: 0,
        });
    }

    const sentinel = document.getElementById("tableLazySentinel");
    if (tableObserver && sentinel) {
        tableObserver.disconnect();
        tableObserver.observe(sentinel);
    }
}

export function renderTable(rows) {
    tableLazyState.rows = rows;
    tableLazyState.rendered = 0;
    dom.resultTableBody.innerHTML = "";
    dom.emptyState.hidden = rows.length > 0;

    const tableWrap = dom.resultTable.closest(".table-wrap");
    if (tableWrap) {
        tableWrap.scrollTop = 0;
    }

    if (rows.length === 0) {
        updateLazySentinel();
        return;
    }

    renderMoreTableRows(TABLE_BATCH_SIZE);
    ensureTableObserver();
}

export function updateSortVisual() {
    const headers = dom.resultTable.querySelectorAll("thead th[data-sort]");
    headers.forEach((head) => {
        const key = head.getAttribute("data-sort");
        const original = head.textContent.replace(/[\u2191\u2193]/g, "").trim();
        const isSorted = key === state.sortKey;
        head.classList.toggle("is-sorted", isSorted);
        if (isSorted) {
            head.textContent = `${original} ${state.sortDirection === "asc" ? "\u2191" : "\u2193"}`;
        } else {
            head.textContent = original;
        }
    });
}

export function setReadyDatasetInfo(summary, errorCount) {
    const descriptor = state.catalog.get(state.currentAlgorithm);
    const generatedAtText = formatGeneratedAt(descriptor?.modifiedAt);
    const compareText = state.compareAlgorithm
        ? ` vs ${state.compareAlgorithm}[${state.compareMode}]`
        : "";

    setDatasetInfo(
        t(
            "index.meta.datasetInfo",
            "{base}[{baseScope}]{compare} | Maps={maps} | Errors={errors} | Generated At {generatedAt}",
            {
                base: state.currentAlgorithm,
                baseScope: state.baseMode,
                compare: compareText,
                maps: summary.totalRows,
                errors: errorCount,
                generatedAt: generatedAtText,
            },
        ),
    );
}
