let charts = {}; // Store chart objects with chart index as key
let seriesMap = {}; // Store series with series key
let currentTheme = 'light'; // Default theme

const chartOptions = {
    dark: {
        layout: {
            background: { type: 'solid', color: '#222222' },
            textColor: '#d1d4dc'
        },
        grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.2)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.2)' }
        },
        timeScale: {
            borderColor: '#d1d4dc',
            timeVisible: true,
            secondsVisible: false
        },
        rightPriceScale: {
            borderColor: '#d1d4dc',
        },
        leftPriceScale: {
            visible: true,
            borderColor: '#d1d4dc',
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal
        }
    },
    light: {
        layout: {
            background: { type: 'solid', color: '#ffffff' },
            textColor: '#000000'
        },
        grid: {
            vertLines: { color: 'rgba(0, 0, 0, 0.1)' },
            horzLines: { color: 'rgba(0, 0, 0, 0.1)' }
        },
        timeScale: {
            borderColor: '#000000',
            timeVisible: true,
            secondsVisible: false
        },
        rightPriceScale: {
            borderColor: '#000000',
        },
        leftPriceScale: {
            visible: true,
            borderColor: '#000000',
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal
        }
    }
};

async function fetchData() {
    const response = await fetch('http://127.0.0.1:5000/data');
    const json = await response.json();
    //console.log("Fetched Data:", json); // Log fetched data
    return json;
}

function createCharts(data, metadata) {
    //console.log("Metadata:", metadata); // Log metadata

    const chartContainer = document.getElementById('chart');
    let lastChartKey = null;

    // Determine the last plotted chart
    for (const key of Object.keys(metadata)) {
        if (key.startsWith('chart') && metadata[key].height > 0) {
            lastChartKey = key;
        }
    }

    if (lastChartKey) {
        // Ensure the last chart has timescale visibility
        metadata[lastChartKey].timescale = true;
    }

    const isIntraday = metadata.interval && (metadata.interval.toLowerCase().includes("minute") || metadata.interval.toLowerCase().includes("hour"));

    for (const [key, meta] of Object.entries(metadata)) {
        if (key.startsWith('chart') && meta.height > 0) {
            const chartDiv = document.createElement('div');
            chartDiv.style.height = `${meta.height}%`;
            chartDiv.style.position = 'relative'; // Ensure legend can be positioned absolutely
            chartContainer.appendChild(chartDiv);

            const chart = LightweightCharts.createChart(chartDiv, {

                width: chartContainer.clientWidth,
                height: chartDiv.clientHeight,
                layout: chartOptions[currentTheme].layout,
                grid: chartOptions[currentTheme].grid,
                crosshair: { mode: LightweightCharts.CrosshairMode.Normal 

                },

                rightPriceScale: {
                    scaleMargins: {top: 0.2, bottom: 0,},
                    borderVisible: true,
                    borderColor: chartOptions[currentTheme].rightPriceScale.borderColor,
                    entireTextOnly: true,
                    visible: true,
                    mode: LightweightCharts.PriceScaleMode.Normal,
                    width: 80,
                    minimumWidth: 100,
                },

                timeScale: {
                    borderColor: chartOptions[currentTheme].timeScale.borderColor,
                    visible: meta.timescale !== false,// Set the timescale visibility based on metadata
                    timeVisible: isIntraday ? false : true,
                    fixLeftEdge: false
                },

                crosshair: { mode: LightweightCharts.CrosshairMode.Normal, // Set crosshair mode here
                },
                
            });

            // Store both chart and chartDiv references in the charts object
            charts[key] = {
                chart: chart,
                chartDiv: chartDiv,
                series: []
            };

            // Create legend for this chart
            const legendContainer = document.createElement('div');
            legendContainer.className = 'legend';
            chartDiv.appendChild(legendContainer);
            
            // Store legend reference in the chart object
            chart.legendContainer = legendContainer;
        }
    }

    // Add series to the charts based on the metadata type
    let mainSeriesMap = {};
    for (const [key, meta] of Object.entries(metadata)) {
        if (!meta.plot || meta.chart === undefined) {
            continue; // Skip series that should not be plotted or missing chart index
        }
        
        let series;
        const chartKey = `chart${meta.chart}`;

        if (meta.type === 'candlestick') {
            series = charts[chartKey].chart.addCandlestickSeries();
        } else if (meta.type === 'line') {
            series = charts[chartKey].chart.addLineSeries({ color: meta.color });
        } else if (meta.type === 'area') {
            series = charts[chartKey].chart.addAreaSeries({
                topColor: meta.topColor,
                bottomColor: meta.bottomColor,
                lineColor: meta.lineColor,
            });
        } else if (meta.type === 'histogram' && key === 'Volume') {
            series = charts[chartKey].chart.addHistogramSeries({
                color: meta.color,
                priceFormat: { type: 'volume' },
                priceScaleId: '', // Set as an overlay
                scaleMargins: {
                    top: 0.7, // Highest point of the series will be 70% away from the top
                    bottom: 0,
                },
            });

            series.priceScale().applyOptions({
                scaleMargins: {
                    top: 0.7,
                    bottom: 0,
                },
            });
        } else if (meta.type === 'histogram') {
            series = charts[chartKey].chart.addHistogramSeries({ color: meta.color });
        } else if (meta.type === 'bars') {
            series = charts[chartKey].chart.addBarSeries({
                upColor: meta.upColor,
                downColor: meta.downColor,
                borderUpColor: meta.borderUpColor,
                borderDownColor: meta.borderDownColor,
            });
        }

        if (series) {
            seriesMap[key] = series;
            charts[chartKey].series.push(series);  // Store series in the chart object
        }

        // Assign main series based on the component or as a fallback
        if (meta.component === 'close' || meta.component === 'open' || meta.component === 'high' || meta.component === 'low') {
            mainSeriesMap[chartKey] = series;
        }

        // Fallback to ensure each chart has a main series
        if (!mainSeriesMap[chartKey]) {
            mainSeriesMap[chartKey] = series;
        }

        // Add legend update logic
        if (charts[chartKey].chart.legendContainer) {
            const symbolName = meta.name || key; // Use metadata name or key as symbol name
            const legend = charts[chartKey].chart.legendContainer;

            const firstRow = document.createElement('div');
            firstRow.innerHTML = symbolName;
            firstRow.style.color = 'black';
            legend.appendChild(firstRow);

            charts[chartKey].chart.subscribeCrosshairMove(param => {
                let priceFormatted = '';
                if (param.time) {
                    const data = param.seriesData.get(series);
                    const price = data ? (data.value !== undefined ? data.value : data.close) : null;
                    if (price !== null) {
                        priceFormatted = price.toFixed(2);
                    }
                }
                firstRow.innerHTML = `${symbolName} <strong>${priceFormatted}</strong>`;
            });
        }
    }

    // Add markers for Signal
    const markers = [];
    data.forEach(item => {
        if (item.Signal === 1) {
            markers.push({
                time: item.time, // Use the time value directly from the item
                position: 'belowBar',
                color: '#26a69a',
                shape: 'arrowUp',
                text: 'Buy',
            });
        } else if (item.Signal === -1) {
            markers.push({
                time: item.time, // Use the time value directly from the item
                position: 'aboveBar',
                color: '#ef5350',
                shape: 'arrowDown',
                text: 'Sell',
            });
        }
    });

    // Assuming the Signal series is on the same chart as Close (candlestick)
    if (mainSeriesMap['chart0']) {
        mainSeriesMap['chart0'].setMarkers(markers);
    }

    // Log the mainSeriesMap to verify its contents
    //console.log("Main Series Map:", mainSeriesMap);

    // Populate series with data
    data.forEach(item => {
        // Convert time to UTCTimestamp if the interval is intraday
        const time = isIntraday ? Math.floor(item.time / 1000) : item.time;

        Object.keys(seriesMap).forEach(key => {
            const series = seriesMap[key];
            if (item[key] !== undefined) {
                if (metadata[key].type === 'area' || metadata[key].type === 'line' || metadata[key].type === 'histogram') {
                    const seriesData = {
                        time: time, // Use UTCTimestamp for intraday data
                        value: item[key],
                    };
                    if (key === 'Volume') {
                        seriesData.color = item.Close >= item.Open ? metadata[key].upColor : metadata[key].downColor;
                    }
                    series.update(seriesData);
                } else if (metadata[key].type === 'candlestick') {
                    series.update({
                        time: time, // Use UTCTimestamp for intraday data
                        open: item.Open,
                        high: item.High,
                        low: item.Low,
                        close: item.Close,
                    });
                } else if (metadata[key].type === 'bars') {
                    series.update({
                        time: time, // Use UTCTimestamp for intraday data
                        open: item.Open,
                        high: item.High,
                        low: item.Low,
                        close: item.Close,
                    });
                }
            }
        });
    });

    // Automatically fit the content to each chart
    Object.values(charts).forEach(chartObj => chartObj.chart.timeScale().fitContent());

    // Synchronize the charts
    // Synchronize the charts
    synchronizeCharts(charts, mainSeriesMap, metadata);

}

function resizeCharts() {
    const chartContainer = document.getElementById('chart');
    const windowHeight = window.innerHeight;
    const buttonHeight = document.querySelector('.buttons').offsetHeight || 0;

    chartContainer.style.height = (windowHeight - buttonHeight) + 'px';

    Object.keys(charts).forEach(chartKey => {
        const chartDiv = charts[chartKey].chartDiv;
        chartDiv.style.height = `${chartContainer.clientHeight / Object.keys(charts).length}px`;

        const chartInstance = charts[chartKey].chart;
        if (chartInstance && typeof chartInstance.resize === 'function') {
            chartInstance.resize(chartDiv.clientWidth, chartDiv.clientHeight);
        } else {
            console.error('Invalid chart instance or missing resize method:', chartInstance);
        }
    });

    Object.values(charts).forEach(chartObject => {
        if (chartObject && typeof chartObject.chart.timeScale === 'function') {
            chartObject.chart.timeScale().fitContent();
        }
    });
}

function updateAllLegends(time) {
    Object.entries(charts).forEach(([chartKey, chartObj]) => {
        updateLegends(chartObj, chartKey, time);
    });
}

function updateLegends(chartObj, time, metadata) {
    requestAnimationFrame(() => {
        const legendContainer = chartObj.chart.legendContainer;

        if (!legendContainer) {
            console.error('Legend container not found for chart:', chartObj);
            return;
        }

        // Clear the legend container before adding new data
        legendContainer.innerHTML = '';

        if (!chartObj.series || chartObj.series.length === 0) {
            console.warn('No series found for chart:', chartObj);
            return;
        }

        const seriesArray = chartObj.series;
        const chartKey = Object.keys(charts).find(key => charts[key] === chartObj);
        //console.log('Series Array:', seriesArray); // Log to verify series presence

        // Iterate over each series associated with this chart
        seriesArray.forEach(series => {
            const priceData = series.data().find(dataPoint => dataPoint.time === time);

            if (priceData) {
                // Retrieve the name from the metadata based on the series
                const seriesName = Object.keys(metadata).find(
                    key => metadata[key].chart === parseInt(chartKey.replace('chart', '')) && series === seriesMap[key]
                );

                const legendRow = document.createElement('div');
                legendRow.className = 'legend-item';
                legendRow.innerHTML = `
                    <strong>${seriesName || 'Series'}</strong>: 
                    ${metadata[seriesName].component === 'candlestick' ? `
                    Open: ${priceData.open || ''} 
                    High: ${priceData.high || ''} 
                    Low: ${priceData.low || ''} 
                    Close: ${priceData.close || ''}` : `
                    ${priceData.close || priceData.value || ''}`}`;
                legendContainer.appendChild(legendRow);
            } else {
                console.warn('No price data found for series:', series);
            }
        });
    });
}

function synchronizeCharts(charts, mainSeriesMap, metadata) {
    const chartKeys = Object.keys(charts);

    // Time scale synchronization (both directions)
    chartKeys.forEach(key1 => {
        const chart1 = charts[key1].chart;

        chart1.timeScale().subscribeVisibleLogicalRangeChange(timeRange => {
            chartKeys.forEach(key2 => {
                if (key1 !== key2) {
                    const chart2 = charts[key2].chart;
                    chart2.timeScale().setVisibleLogicalRange(timeRange);
                }
            });
        });
    });

    // Crosshair synchronization (both directions)
    chartKeys.forEach(key1 => {
        const chart1 = charts[key1].chart;
        const mainSeries1 = mainSeriesMap[key1];

        chart1.subscribeCrosshairMove(param => {
            const dataPoint = getCrosshairDataPoint(mainSeries1, param);
            if (dataPoint) {
                // Update the legend for the current chart
                updateLegends(charts[key1], param.time, metadata);
                
                chartKeys.forEach(key2 => {
                    if (key1 !== key2) {
                        const chart2 = charts[key2].chart;
                        const mainSeries2 = mainSeriesMap[key2];

                        // Sync crosshair position
                        syncCrosshair(chart2, mainSeries2, dataPoint);

                        // Update legends for each chart
                        updateLegends(charts[key2], param.time, metadata);
                    }
                });
            }
        });
    });
}

// This function retrieves the data point associated with the crosshair position
function getCrosshairDataPoint(series, param) {
    if (!param.time) {
        return null;
    }
    const dataPoint = param.seriesData.get(series);
    return dataPoint || null;
}

// This function syncs the crosshair position across the charts
function syncCrosshair(chart, series, dataPoint) {
    if (dataPoint) {
        chart.setCrosshairPosition(dataPoint.value, dataPoint.time, series);
        return;
    }
    chart.clearCrosshairPosition();
}


function applyLegendTheme(theme) {
    const legends = document.querySelectorAll('.legend, .interactive-legend');
    legends.forEach(legend => {
        if (theme === 'light') {
            legend.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            legend.style.color = '#000000';
        } else {
            legend.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            legend.style.color = '#ffffff';
        }

        // Force repaint by slightly delaying re-application of styles
        requestAnimationFrame(() => {
            legend.style.display = 'none';
            requestAnimationFrame(() => {
                legend.style.display = 'block';

                // Force update the text color
                legend.querySelectorAll('div').forEach(textDiv => {
                    textDiv.style.color = theme === 'light' ? '#000000' : '#ffffff';
                });
            });
        });
    });
}

// Fetch data and create charts
fetchData().then(json => {
    createCharts(json.data, json.metadata);

    // Apply the current theme to legends after charts are created
    applyLegendTheme(currentTheme);

    // Force repaint without resizing
    requestAnimationFrame(() => {
        const chartContainer = document.getElementById('chart-container');
        chartContainer.style.display = 'none';
        chartContainer.offsetHeight; // Trigger reflow
        chartContainer.style.display = 'flex';
    });

    // Apply the box appearance that happens during the theme toggle
    Object.values(charts).forEach(chartObj => {
        chartObj.chart.applyOptions(chartOptions[currentTheme]);
        chartObj.chart.applyOptions({
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
        });
        console.log('Crosshair mode set to Normal for chart:', chartObj.chart);
    });
});

// Responsive resize
window.addEventListener('resize', resizeCharts);

// Theme toggle button functionality
document.getElementById('theme-toggle').addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        Object.values(charts).forEach(chartObj => {
            chartObj.chart.applyOptions(chartOptions[currentTheme]);

            // Set crosshair mode to Normal after applying theme options
            chartObj.chart.applyOptions({
                crosshair: {
                    mode: LightweightCharts.CrosshairMode.Normal,
                },
            });

            // Debugging: Check if the crosshair mode was set correctly
            const appliedOptions = chartObj.chart.options();
            console.log('Crosshair mode applied:', appliedOptions.crosshair.mode);
        });

    applyLegendTheme(currentTheme);
    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
});




