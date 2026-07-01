/* ==========================================================================
   Various functions that we want to use within the template
   ========================================================================== */

/*jslint es6 */
'use strict';

// Constants for CDNs
const PLOTLY_URL = "https://cdn.jsdelivr.net/npm/plotly.js@3.6.0/dist/plotly.min.js";
const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

// Detect OS/browser preference
const browserPref = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

// Determine the computed theme, which can be "dark" or "light".
function determineComputedTheme() {
  // Determine the expected state of the theme toggle, which can be "dark", "light", or default "system"
  let themeSetting = localStorage.getItem("theme");
  themeSetting = (themeSetting != "dark" && themeSetting != "light" && themeSetting != "system") ? "system" : themeSetting;

  // Return the setting if set, or use the browser preference
  if (themeSetting != "system") {
    return themeSetting;
  }
  return browserPref ? "dark" : "light";
}

// Set the theme on page load or when explicitly called
function setTheme(theme) {
  const use_theme = theme ||
    localStorage.getItem("theme") ||
    $("html").attr("data-theme") ||
    browserPref;

  if (use_theme === "dark") {
    $("html").attr("data-theme", "dark");
    $("#theme-icon").removeClass("fa-sun").addClass("fa-moon");
  } else if (use_theme === "light") {
    $("html").removeAttr("data-theme");
    $("#theme-icon").removeClass("fa-moon").addClass("fa-sun");
  }
}

// Toggle the theme manually
function toggleTheme() {
  const current_theme = $("html").attr("data-theme");
  const new_theme = current_theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", new_theme);
  setTheme(new_theme);
  redrawPlotly();
}

// Defer the loading of Mermaid to only if there is a field on the page to be rendered
let mermaidElements = document.querySelectorAll("pre>code.language-mermaid");
if (mermaidElements.length > 0) {
  document.addEventListener("readystatechange", function() {
    // Append the Mermaid module to the DOM
    const moduleScript = document.createElement('script');
    moduleScript.type = 'module';
    moduleScript.textContent = `
      import mermaid from '${MERMAID_URL}';
      mermaid.initialize({startOnLoad:true, theme:'default'});
      await mermaid.run({querySelector:'code.language-mermaid'});
    `;
    document.body.appendChild(moduleScript);
  });
}

/* ==========================================================================
   Plotly integration script so that Markdown codeblocks will be rendered
   ========================================================================== */

// Read the Plotly data from the code block, hide it, and render the chart as new node. This allows for the
// JSON data to be retrieved when the theme is switched. The listener should only be added if the data is
// actually present on the page.
//
// NOTE that plotlyDarkLayout and plotlyLightLayout will be exposed in the minimized file
let plotlyElements = document.querySelectorAll("pre>code.language-plotly");

function applyPlotlyTheme(jsonData) {
  const theme = (determineComputedTheme() === "dark") ? plotlyDarkLayout : plotlyLightLayout;

  if (jsonData.layout) {
    jsonData.layout.template = (jsonData.layout.template) ? { ...theme, ...jsonData.layout.template } : theme;
  } else {
    jsonData.layout = { template: theme };
  }

  return jsonData;
}

function getOrCreatePlotlyChartElement(elem) {
  elem.parentElement.classList.add("hidden");

  let chartElement = elem.parentElement.nextElementSibling;
  if (chartElement && chartElement.classList.contains("plotly-search-wrapper")) {
    chartElement = chartElement.nextElementSibling;
  }

  if (!chartElement || !chartElement.classList.contains("plotly-chart")) {
    chartElement = document.createElement("div");
    chartElement.classList.add("plotly-chart");

    const searchElement = elem.parentElement.nextElementSibling;
    if (searchElement && searchElement.classList.contains("plotly-search-wrapper")) {
      searchElement.after(chartElement);
    } else {
      elem.parentElement.after(chartElement);
    }
  }

  return chartElement;
}

function mergePlotlyConfig(externalData, blockConfig) {
  return {
    ...externalData,
    layout: {
      ...(externalData.layout || {}),
      ...(blockConfig.layout || {})
    },
    config: {
      ...(externalData.config || {}),
      ...(blockConfig.config || {})
    }
  };
}

function normalizePlotlySearchConfig(searchConfig) {
  if (searchConfig === true) {
    return {
      enabled: true,
      placeholder: "Search points...",
      maxMatches: 100
    };
  }

  if (!searchConfig || searchConfig.enabled === false) {
    return { enabled: false };
  }

  return {
    enabled: true,
    placeholder: searchConfig.placeholder || "Search points...",
    maxMatches: searchConfig.maxMatches || 100
  };
}

function getPlotlySearchElement(elem) {
  const sibling = elem.parentElement.nextElementSibling;
  return (sibling && sibling.classList.contains("plotly-search-wrapper")) ? sibling : null;
}

function getOrCreatePlotlySearchElement(elem, chartElement, searchConfig) {
  let searchElement = getPlotlySearchElement(elem);
  if (!searchElement) {
    searchElement = document.createElement("div");
    searchElement.classList.add("plotly-search-wrapper");

    const input = document.createElement("input");
    input.classList.add("plotly-search-input");
    input.type = "search";
    input.autocomplete = "off";
    input.spellcheck = false;
    searchElement.appendChild(input);

    const status = document.createElement("span");
    status.classList.add("plotly-search-status");
    status.setAttribute("aria-live", "polite");
    searchElement.appendChild(status);

    chartElement.before(searchElement);
  }

  const input = searchElement.querySelector(".plotly-search-input");
  input.placeholder = searchConfig.placeholder;

  return searchElement;
}

function getPlotlySearchTerms(query) {
  return query
    .split(/[,\s]+/)
    .map(function(term) {
      return term.trim().toLowerCase();
    })
    .filter(function(term) {
      return term.length > 0;
    });
}

function findPlotlySearchMatches(jsonData, query, maxMatches) {
  const terms = getPlotlySearchTerms(query);
  const matches = [];
  let totalMatches = 0;

  if (terms.length === 0) {
    return { matches: matches, totalMatches: totalMatches };
  }

  (jsonData.data || []).forEach(function(trace) {
    if (!trace || !trace.text || !trace.x || !trace.y) {
      return;
    }

    trace.text.forEach(function(label, index) {
      const labelText = String(label || "");
      const labelSearchText = labelText.toLowerCase();
      const isMatch = terms.some(function(term) {
        return labelSearchText.indexOf(term) !== -1;
      });

      if (!isMatch) {
        return;
      }

      totalMatches += 1;
      if (matches.length < maxMatches) {
        matches.push({
          x: trace.x[index],
          y: trace.y[index],
          text: labelText
        });
      }
    });
  });

  return { matches: matches, totalMatches: totalMatches };
}

function updatePlotlySearchHighlight(chartElement, jsonData, query, searchConfig, statusElement) {
  const maxMatches = searchConfig.maxMatches || 100;
  const result = findPlotlySearchMatches(jsonData, query, maxMatches);
  const existingIndex = (chartElement.data || []).findIndex(function(trace) {
    return trace.name === "Search match";
  });

  if (result.totalMatches === 0) {
    statusElement.textContent = query.trim() ? "No matches" : "";
    if (existingIndex >= 0) {
      Plotly.deleteTraces(chartElement, existingIndex);
    }
    return;
  }

  const labelMatches = result.matches.length <= 10;
  const highlightTrace = {
    type: "scattergl",
    mode: labelMatches ? "markers+text" : "markers",
    name: "Search match",
    x: result.matches.map(function(match) { return match.x; }),
    y: result.matches.map(function(match) { return match.y; }),
    text: result.matches.map(function(match) { return match.text; }),
    textposition: "top center",
    marker: {
      color: "#ffbf00",
      size: 13,
      line: {
        color: "#111",
        width: 2
      }
    },
    hovertemplate: "Gene: %{text}<br>log2FC: %{x:.3f}<br>-log10 padj: %{y:.3f}<extra>Search match</extra>"
  };

  const statusText = (result.totalMatches === result.matches.length)
    ? result.totalMatches + " match" + (result.totalMatches === 1 ? "" : "es")
    : result.matches.length + " of " + result.totalMatches + " matches highlighted";
  statusElement.textContent = statusText;

  if (existingIndex >= 0) {
    Plotly.deleteTraces(chartElement, existingIndex)
      .then(function() {
        return Plotly.addTraces(chartElement, highlightTrace);
      });
  } else {
    Plotly.addTraces(chartElement, highlightTrace);
  }
}

function setupPlotlySearch(elem, chartElement, jsonData, blockConfig) {
  const searchConfig = normalizePlotlySearchConfig(blockConfig.search);
  const existingSearchElement = getPlotlySearchElement(elem);

  if (!searchConfig.enabled) {
    if (existingSearchElement) {
      existingSearchElement.remove();
    }
    return;
  }

  const searchElement = getOrCreatePlotlySearchElement(elem, chartElement, searchConfig);
  const input = searchElement.querySelector(".plotly-search-input");
  const status = searchElement.querySelector(".plotly-search-status");

  input._plotlySearchState = {
    chartElement: chartElement,
    jsonData: jsonData,
    searchConfig: searchConfig,
    status: status
  };

  if (!input._plotlySearchBound) {
    input.addEventListener("input", function() {
      const state = input._plotlySearchState;
      updatePlotlySearchHighlight(
        state.chartElement,
        state.jsonData,
        input.value,
        state.searchConfig,
        state.status
      );
    });
    input._plotlySearchBound = true;
  }

  if (input.value) {
    updatePlotlySearchHighlight(chartElement, jsonData, input.value, searchConfig, status);
  } else {
    status.textContent = "";
  }
}

function renderPlotlyFigure(elem, chartElement, jsonData, blockConfig) {
  return Plotly.react(chartElement, jsonData.data, jsonData.layout, jsonData.config)
    .then(function() {
      setupPlotlySearch(elem, chartElement, jsonData, blockConfig);
    });
}

function renderPlotlyElement(elem) {
  const blockConfig = JSON.parse(elem.textContent);
  const chartElement = getOrCreatePlotlyChartElement(elem);

  if (blockConfig.src) {
    fetch(blockConfig.src)
      .then(function(response) {
        if (!response.ok) {
          throw new Error("Failed to load Plotly data: " + blockConfig.src);
        }
        return response.json();
      })
      .then(function(externalData) {
        const jsonData = applyPlotlyTheme(mergePlotlyConfig(externalData, blockConfig));
        renderPlotlyFigure(elem, chartElement, jsonData, blockConfig);
      })
      .catch(function(error) {
        chartElement.textContent = error.message;
      });
  } else {
    const jsonData = applyPlotlyTheme(blockConfig);
    renderPlotlyFigure(elem, chartElement, jsonData, blockConfig);
  }
}

if (plotlyElements.length > 0) {
  document.addEventListener("readystatechange", function() {
    // Return if not ready
    if (document.readyState !== "complete") {
      return;
    }

    // Prepare to load Plotly from the CDN
    const script = document.createElement('script');
    script.src = PLOTLY_URL;
    script.async = true;

    // Once loaded, update the page elements to work with it
    script.onload = function() {
      plotlyElements.forEach(renderPlotlyElement);
    }

    // Add the script to the document
    document.head.appendChild(script);
  });
}

function redrawPlotly() {
  if (typeof Plotly === "undefined") {
    return;
  }

  plotlyElements.forEach(renderPlotlyElement);
}

/* ==========================================================================
   Actions that should occur when the page has been fully loaded
   ========================================================================== */

$(document).ready(function () {
  // SCSS SETTINGS - These should be the same as the settings in the relevant files
  const scssLarge = 925;          // pixels, from /_sass/_themes.scss
  const scssMastheadHeight = 70;  // pixels, from the current theme (e.g., /_sass/theme/_default.scss)

  // If the user hasn't chosen a theme, follow the OS preference
  setTheme();
  window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener("change", (e) => {
          if (!localStorage.getItem("theme")) {
            setTheme(e.matches ? "dark" : "light");
          }
        });

  // Enable the theme toggle
  $('#theme-toggle').on('click', toggleTheme);

  // Enable the sticky footer
  var bumpIt = function () {
    $("body").css("padding-bottom", "0");
    $("body").css("margin-bottom", $(".page__footer").outerHeight(true));
  }
  $(window).resize(function () {
    didResize = true;
  });
  setInterval(function () {
    if (didResize) {
      didResize = false;
      bumpIt();
    }}, 250);
  var didResize = false;
  bumpIt();

  // Follow menu drop down
  $(".author__urls-wrapper button").on("click", function () {
    $(".author__urls").fadeToggle("fast", function () { });
    $(".author__urls-wrapper button").toggleClass("open");
  });

  // Restore the follow menu if toggled on a window resize
  jQuery(window).on('resize', function () {
    if ($('.author__urls.social-icons').css('display') == 'none' && $(window).width() >= scssLarge) {
      $(".author__urls").css('display', 'block')
    }
  });

});
