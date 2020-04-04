import {DatasourceProvider} from "./DatasourceProvider";

import Papa from "papaparse";
import {Data, Dataset, Datasource} from "./Datasource";

import * as Population from "../Population";
import * as Testing from "../TestingRates";

export class JHDatasourceProvider extends DatasourceProvider {

    BLACKLIST_NAMES = ["Recovered, Canada", "MS Zaandam", "", "Recovered, US"];

    constructor() {
        super("Johns Hopkins CSSE COVID-19");
        this.historyConfirmedUrl = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv";
        this.historyRecoveredUrl = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv";
        this.historyDeceasedUrl = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv";

        this.historyUSConfirmedUrl = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv";
        this.historyUSDeceasedUrl = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv";

        this.liveUrl = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/web-data/data/cases.csv";
        this.liveCountriesUrl = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/web-data/data/cases_country.csv";
        this.liveUSStatesUrl = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/web-data/data/cases_state.csv";
    }

    getDatasource = (loadUScounties, callback) => {
        let ds = new Datasource();
        // load confirmed data
        this.loadFromUrl(this.historyConfirmedUrl, (rawConfirmed) => {
            this.loadFromUrl(this.historyRecoveredUrl, (rawRecovered) => {
                this.loadFromUrl(this.historyDeceasedUrl, (rawDeceased) => {
                    this.loadFromUrl(this.historyUSConfirmedUrl, (rawUSConfirmed) => {
                        this.loadFromUrl(this.historyUSDeceasedUrl, (rawUSDeceased) => {
                            this.loadFromUrl(this.liveCountriesUrl, (rawCountries) => {
                                this.loadFromUrl(this.liveUSStatesUrl, (rawUSStates) => {
                                    this.loadFromUrl(this.liveUrl, (rawLive) => {
                                        // load history
                                        this.parseHistory(ds, rawConfirmed.data, rawRecovered.data, rawDeceased.data, callback);
                                        if(loadUScounties) {
                                            this.parseHistoryUS(ds, rawUSConfirmed.data, rawUSDeceased.data);
                                        }
                                        // load live stats
                                        ds.datasets.push(new Dataset(new Date().toLocaleDateString().replace("2020", "20")));
                                        if (loadUScounties) {
                                            this.parseLive(ds, rawLive.data);
                                        }
                                        this.parseLiveCountries(ds, rawCountries.data);
                                        this.parseLiveUSStates(ds, rawUSStates.data);
                                        this.fillEmpty(ds);
                                        // infer data
                                        this.computeActive(ds);
                                        this.computeConfirmedProjected(ds);
                                        this.computeContainmentScore(ds);
                                        this.computeTotals(ds);

                                        callback(ds);
                                    });
                                });
                            });
                        });
                    });
                });
            })
        });
    };

    parseLive(ds, tableCountries) {
        let dataset = ds.datasets[ds.datasets.length - 1].data;
        let header = true;
        for(let row of tableCountries) {
            if(header) {
                header = false;
                continue;
            }
            if(row.length < 3) {
                continue
            }
            let name = "";
            if(row[1]) {
                name += row[1] + ", ";
            }
            if(row[2]) {
                name += row[2] + ", ";
            }
            if(row[3]) {
                name += row[3];
            }
            if(this.BLACKLIST_NAMES.includes(name)) {
                continue;
            }
            ds.locations[name] = [row[6], row[5]];

            let data = new Data();
            data.absolute.current.confirmed = Number(row[7]);
            data.absolute.current.recovered= Number(row[9]);
            data.absolute.current.deceased = Number(row[8]);

            data.ppm.current.confirmed = this.ppm(name, data.absolute.current.confirmed);
            data.ppm.current.recovered = this.ppm(name, data.absolute.current.recovered);
            data.ppm.current.deceased = this.ppm(name, data.absolute.current.deceased);

            if(ds.datasets[ds.datasets.length - 3].data[name]) {
                data.absolute.growthLast1Day.confirmed = data.absolute.current.confirmed - ds.datasets[ds.datasets.length - 3].data[name].absolute.current.confirmed;
                data.absolute.growthLast1Day.recovered = data.absolute.current.recovered - ds.datasets[ds.datasets.length - 3].data[name].absolute.current.recovered;
                data.absolute.growthLast1Day.deceased = data.absolute.current.deceased - ds.datasets[ds.datasets.length - 3].data[name].absolute.current.deceased;

                data.ppm.growthLast1Day.confirmed = this.ppm(name, data.absolute.growthLast1Day.confirmed);
                data.ppm.growthLast1Day.recovered = this.ppm(name, data.absolute.growthLast1Day.recovered);
                data.ppm.growthLast1Day.deceased = this.ppm(name, data.absolute.growthLast1Day.deceased);
            }

            if(ds.datasets[ds.datasets.length - 4].data[name]) {
                data.absolute.growthLast3Days.confirmed = data.absolute.current.confirmed - ds.datasets[ds.datasets.length - 4].data[name].absolute.current.confirmed;
                data.absolute.growthLast3Days.recovered = data.absolute.current.recovered - ds.datasets[ds.datasets.length - 4].data[name].absolute.current.recovered;
                data.absolute.growthLast3Days.deceased = data.absolute.current.deceased - ds.datasets[ds.datasets.length - 4].data[name].absolute.current.deceased;

                data.ppm.growthLast3Days.confirmed = this.ppm(name, data.absolute.growthLast3Days.confirmed);
                data.ppm.growthLast3Days.recovered = this.ppm(name, data.absolute.growthLast3Days.recovered);
                data.ppm.growthLast3Days.deceased = this.ppm(name, data.absolute.growthLast3Days.deceased);
            }

            if(ds.datasets[ds.datasets.length - 8].data[name]) {
                data.absolute.growthLast7Days.confirmed = data.absolute.current.confirmed - ds.datasets[ds.datasets.length - 8].data[name].absolute.current.confirmed;
                data.absolute.growthLast7Days.recovered = data.absolute.current.recovered - ds.datasets[ds.datasets.length - 8].data[name].absolute.current.recovered;
                data.absolute.growthLast7Days.deceased = data.absolute.current.deceased - ds.datasets[ds.datasets.length - 8].data[name].absolute.current.deceased;

                data.ppm.growthLast7Days.confirmed = this.ppm(name, data.absolute.growthLast7Days.confirmed);
                data.ppm.growthLast7Days.recovered = this.ppm(name, data.absolute.growthLast7Days.recovered);
                data.ppm.growthLast7Days.deceased = this.ppm(name, data.absolute.growthLast7Days.deceased);
            }

            dataset[name] = data;
        }
    }

    parseLiveCountries(ds, tableCountries) {
        // ds.datasets.push(new Dataset(new Date().toLocaleDateString().replace("2020", "20")));
        let dataset = ds.datasets[ds.datasets.length - 1].data;
        let header = true;
        for(let row of tableCountries) {
            if(header) {
                header = false;
                continue;
            }
            if(row.length < 3) {
                continue
            }
            let name = row[0];
            if(this.BLACKLIST_NAMES.includes(name)) {
                continue;
            }
            ds.locations[name] = [row[3], row[2]];

            let data = new Data();
            data.absolute.current.confirmed = Number(row[4]);
            data.absolute.current.recovered= Number(row[6]);
            data.absolute.current.deceased = Number(row[5]);

            data.ppm.current.confirmed = this.ppm(name, data.absolute.current.confirmed);
            data.ppm.current.recovered = this.ppm(name, data.absolute.current.recovered);
            data.ppm.current.deceased = this.ppm(name, data.absolute.current.deceased);

            if(ds.datasets[ds.datasets.length - 3].data[name]) {
                data.absolute.growthLast1Day.confirmed = data.absolute.current.confirmed - ds.datasets[ds.datasets.length - 3].data[name].absolute.current.confirmed;
                data.absolute.growthLast1Day.recovered = data.absolute.current.recovered - ds.datasets[ds.datasets.length - 3].data[name].absolute.current.recovered;
                data.absolute.growthLast1Day.deceased = data.absolute.current.deceased - ds.datasets[ds.datasets.length - 3].data[name].absolute.current.deceased;

                data.ppm.growthLast1Day.confirmed = this.ppm(name, data.absolute.growthLast1Day.confirmed);
                data.ppm.growthLast1Day.recovered = this.ppm(name, data.absolute.growthLast1Day.recovered);
                data.ppm.growthLast1Day.deceased = this.ppm(name, data.absolute.growthLast1Day.deceased);
            }

            if(ds.datasets[ds.datasets.length - 4].data[name]) {
                data.absolute.growthLast3Days.confirmed = data.absolute.current.confirmed - ds.datasets[ds.datasets.length - 4].data[name].absolute.current.confirmed;
                data.absolute.growthLast3Days.recovered = data.absolute.current.recovered - ds.datasets[ds.datasets.length - 4].data[name].absolute.current.recovered;
                data.absolute.growthLast3Days.deceased = data.absolute.current.deceased - ds.datasets[ds.datasets.length - 4].data[name].absolute.current.deceased;

                data.ppm.growthLast3Days.confirmed = this.ppm(name, data.absolute.growthLast3Days.confirmed);
                data.ppm.growthLast3Days.recovered = this.ppm(name, data.absolute.growthLast3Days.recovered);
                data.ppm.growthLast3Days.deceased = this.ppm(name, data.absolute.growthLast3Days.deceased);
            }

            if(ds.datasets[ds.datasets.length - 8].data[name]) {
                data.absolute.growthLast7Days.confirmed = data.absolute.current.confirmed - ds.datasets[ds.datasets.length - 8].data[name].absolute.current.confirmed;
                data.absolute.growthLast7Days.recovered = data.absolute.current.recovered - ds.datasets[ds.datasets.length - 8].data[name].absolute.current.recovered;
                data.absolute.growthLast7Days.deceased = data.absolute.current.deceased - ds.datasets[ds.datasets.length - 8].data[name].absolute.current.deceased;

                data.ppm.growthLast7Days.confirmed = this.ppm(name, data.absolute.growthLast7Days.confirmed);
                data.ppm.growthLast7Days.recovered = this.ppm(name, data.absolute.growthLast7Days.recovered);
                data.ppm.growthLast7Days.deceased = this.ppm(name, data.absolute.growthLast7Days.deceased);
            }

            dataset[name] = data;
        }
    }

    parseLiveUSStates(ds, tableUSStates) {
        let dataset = ds.datasets[ds.datasets.length - 1].data;
        let header = true;
        for(let row of tableUSStates) {
            if(header) {
                header = false;
                continue;
            }
            if(row.length < 3) {
                continue
            }
            let name = "";
            if(row[1]) {
                name += row[1] + ", ";
            }
            if(row[2]) {
                name += row[2];
            }
            if(this.BLACKLIST_NAMES.includes(name)) {
                continue;
            }
            ds.locations[name] = [row[5], row[4]];

            let data = new Data();
            data.absolute.current.confirmed = Number(row[6]);
            data.absolute.current.recovered= Number(row[8]);
            data.absolute.current.deceased = Number(row[7]);

            data.ppm.current.confirmed = this.ppm(name, data.absolute.current.confirmed);
            data.ppm.current.recovered = this.ppm(name, data.absolute.current.recovered);
            data.ppm.current.deceased = this.ppm(name, data.absolute.current.deceased);

            // data.absolute.growthLast1Day.confirmed = -1;
            // data.absolute.growthLast1Day.recovered = -1;
            // data.absolute.growthLast1Day.deceased = -1;

            data.ppm.growthLast1Day.confirmed = -1;
            data.ppm.growthLast1Day.recovered = -1;
            data.ppm.growthLast1Day.deceased = -1;

            dataset[name] = data;
        }
    }

    fillEmpty = (ds) => {
        ds.datasets.map((dataset, dateIndex) => {
            Object.keys(ds.locations).map((name, nameIndex) => {
                if(!(name in dataset.data)) {

                    let lastData = ds.datasets[ds.datasets.length - 2].data[name];

                    let data = new Data();
                    data.absolute.current.confirmed = lastData ? lastData.absolute.current.confirmed : -1;
                    data.absolute.current.recovered = lastData ? lastData.absolute.current.recovered : -1;
                    data.absolute.current.deceased = lastData ? lastData.absolute.current.deceased : -1;

                    data.absolute.growthLast1Day.confirmed = lastData ? lastData.absolute.growthLast1Day.confirmed : -1;
                    data.absolute.growthLast1Day.recovered = lastData ? lastData.absolute.growthLast1Day.recovered : -1;
                    data.absolute.growthLast1Day.deceased = lastData ? lastData.absolute.growthLast1Day.deceased : -1;

                    data.absolute.growthLast3Days.confirmed = lastData ? lastData.absolute.growthLast3Days.confirmed : -1;
                    data.absolute.growthLast3Days.recovered = lastData ? lastData.absolute.growthLast3Days.recovered : -1;
                    data.absolute.growthLast3Days.deceased = lastData ? lastData.absolute.growthLast3Days.deceased : -1;

                    data.absolute.growthLast7Days.confirmed = lastData ? lastData.absolute.growthLast7Days.confirmed : -1;
                    data.absolute.growthLast7Days.recovered = lastData ? lastData.absolute.growthLast7Days.recovered : -1;
                    data.absolute.growthLast7Days.deceased = lastData ? lastData.absolute.growthLast7Days.deceased : -1;

                    dataset.data[name] = data;
                }
            });
        });
    };

    parseHistory = (ds, tableConfirmed, tableRecovered, tableDeceased) => {
        this.parseTable(ds, "confirmed", tableConfirmed, true);
        this.parseTable(ds, "recovered", tableRecovered, false);
        this.parseTable(ds, "deceased", tableDeceased, false);
    };

    parseHistoryUS = (ds, tableUSConfirmed, tableUSDeceased) => {
        this.parseTable(ds, "confirmed", tableUSConfirmed, false, true);
        this.parseTable(ds, "deceased", tableUSDeceased, false, true, 1);
    };

    computeTotals = (ds) => {
        ds.datasets.map((dataset, datasetIndex) => {
            Object.keys(dataset.data).map((name, nameIndex) => {
                let locationData = dataset.data[name];

                // sums
                if(
                    !name.endsWith(", US") &&
                    name!=="China" &&
                    name!=="Australia"
                ) {
                    dataset.totalConfirmed += locationData.absolute.current.confirmed;
                    dataset.totalRecovered += locationData.absolute.current.recovered;
                    dataset.totalDeceased += locationData.absolute.current.deceased;
                    dataset.totalActive += locationData.absolute.current.active;
                    dataset.totalConfirmedProjected += Math.max(locationData.absolute.current.confirmed,
                        locationData.absolute.current.confirmedProjected);
                }

                // track max
                ds.maxValue = Math.max(ds.maxValue, locationData.absolute.current.confirmed);
                ds.maxValue = Math.max(ds.maxValue, locationData.absolute.current.confirmedProjected);
            });
        });
    };

    computeContainmentScore = (ds) => {
        ds.datasets.map((dataset, dateIndex) => {
            Object.keys(dataset.data).map((name, nameIndex) => {
                let locationData = dataset.data[name];
                if(dateIndex < ds.datasets.length - 1) {
                    let g1 = 0.1 * locationData.absolute.growthLast1Day.confirmed / locationData.absolute.current.confirmed;
                    let g3 = 0.3 * locationData.absolute.growthLast3Days.confirmed / locationData.absolute.current.confirmed;
                    let g7 = 0.6 * locationData.absolute.growthLast7Days.confirmed / locationData.absolute.current.confirmed;
                    let g = (g1 + g3 + g7);
                    if (g >= 1) {
                        locationData.containmentScore = 0;
                    } else if (g >= 0.5) {
                        locationData.containmentScore = 1;
                    } else if (g >= 0.2) {
                        locationData.containmentScore = 2;
                    } else if (g >= 0.1) {
                        locationData.containmentScore = 3;
                    } else if (g >= 0.05) {
                        locationData.containmentScore = 4;
                    } else if (g >= 0.02) {
                        locationData.containmentScore = 5;
                    } else if (g >= 0.01) {
                        locationData.containmentScore = 6;
                    } else if (g >= 0.005) {
                        locationData.containmentScore = 7;
                    } else if (g >= 0.002) {
                        locationData.containmentScore = 8;
                    } else if (g >= 0.001) {
                        locationData.containmentScore = 9;
                    } else if (g >= 0.0) {
                        locationData.containmentScore = 10;
                    }
                } else {
                    // take score from yesterday
                    if(ds.datasets[ds.datasets.length - 2].data[name].absolute.current.confirmed === -1) {
                        return;
                    }
                    locationData.containmentScore = ds.datasets[ds.datasets.length - 2].data[name].containmentScore;
                }
            });
        });
    };

    computeConfirmedProjected = (ds) => {
        // compute global average testing rate
        let avgTested = 0;
        let avgPopulation = 0;
        let countTested = 0;
        let countPopulation = 0;
        Object.keys(ds.locations).map((name, index) => {
            if(Testing.RATES[name] && Population.ABSOLUTE[name]) {
                avgTested += Testing.RATES[name];
                avgPopulation += Population.ABSOLUTE[name];
                countTested++;
                countPopulation++;
            }
            else {
                // console.log("No testing rates or population data for '" + name + "'.")
            }
        });
        avgTested /= countTested;
        avgPopulation /= countPopulation;
        let globalTestingRate = avgTested / avgPopulation;
        ds.datasets.map((dataset, datasetIndex) => {
            Object.keys(dataset.data).map((name, locationIndex) => {
                if(Testing.RATES[name] && Population.ABSOLUTE[name]) {
                    this.computeConfirmedProjectedBlock(name, dataset.data[name].absolute, globalTestingRate);
                    this.computeConfirmedProjectedBlock(name, dataset.data[name].ppm, globalTestingRate);
                }
            });
        });
    };

    computeConfirmedProjectedBlock = (name, block, globalTestingRate) => {
        let localTestingRate = Testing.RATES[name] / Population.ABSOLUTE[name];
        let scale = globalTestingRate / localTestingRate;
        this.calculateConfirmedProjected(scale, block.current);
        this.calculateConfirmedProjected(scale, block.growthLast1Day);
        this.calculateConfirmedProjected(scale, block.growthLast3Days);
        this.calculateConfirmedProjected(scale, block.growthLast7Days);
    };

    calculateConfirmedProjected = (scale, value) => {
        value["confirmedProjected"] = value["confirmed"] * scale;
    };

    computeActive = (ds) => {
        ds.datasets.map((dataset, datasetIndex) => {
            Object.values(dataset.data).map((locationData, locationIndex) => {
                this.computeActiveBlock(locationData.absolute);
                this.computeActiveBlock(locationData.ppm);
            });
        });
    };

    computeActiveBlock = (block) => {
        this.calculateActive(block.current);
        this.calculateActive(block.growthLast1Day);
        this.calculateActive(block.growthLast3Days);
        this.calculateActive(block.growthLast7Days);
    };

    calculateActive = (value) => {
        value["active"] = value["confirmed"] - value["recovered"] - value["deceased"];
    };

    parseTable = (ds, attribute, table, parseHeader, parseRowUS=false, seriesOffset=0) => {
        let header = true;
        for(let data of table) {
            if(header) {
                if(parseHeader) {
                    this.parseHeader(ds, data);
                }
                header = false;
            }
            else {
                if(parseRowUS) {
                    this.parseRowUS(ds, attribute, data, seriesOffset);
                } else {
                    this.parseRow(ds, attribute, data);
                }
            }
        }
    };

    parseRowUS = (ds, attribute, row, seriesOffset=0) => {
        let name = row[10];
        if(this.BLACKLIST_NAMES.includes(name)) {
            return;
        }
        ds.locations[name] = [row[9], row[8]];
        for(let i = 11 + seriesOffset; i < row.length; i++) {
            let data = ds.datasets[i - 11 - seriesOffset].data;
            if(!data[name]) {
                data[name] = new Data();
            }
            let locationData = data[name];
            this.parseBlock(name, row, i, attribute, locationData);
        }
    };

    parseHeader = (ds, header) => {
        for(let i = 4; i < header.length; i++) {
            ds.datasets.push(new Dataset(header[i]));
        }
    };

    parseRow = (ds, attribute, row) => {
        let name = "";
            if(row[0]) {
                name += row[0] + ", ";
            }
            if(row[1]) {
                name += row[1];
            }
        if(this.BLACKLIST_NAMES.includes(name)) {
            return;
        }
        ds.locations[name] = [row[3], row[2]];
        for(let i = 4; i < row.length; i++) {
            let data = ds.datasets[i - 4].data;
            if(!data[name]) {
                data[name] = new Data();
            }
            let locationData = data[name];
            this.parseBlock(name, row, i, attribute, locationData);
        }
    };

    parseBlock = (name, row, i, attribute, locationData) => {
        // absolute current
        let value = Number(row[i]);
        locationData.absolute.current[attribute] = value;
        locationData.ppm.current[attribute] = this.ppm(name, value);

        // absolute growth last 1 day
        if(i >= 5) {
            locationData.absolute.growthLast1Day[attribute] = value - Number(row[i - 1]);
            locationData.ppm.growthLast1Day[attribute] = this.ppm(name, value - Number(row[i - 1]));
        } else {
            locationData.absolute.growthLast1Day[attribute] = 0;
            locationData.ppm.growthLast1Day[attribute] = 0;
        }

        // absolute growth last 3 days
        if(i >= 7) {
            locationData.absolute.growthLast3Days[attribute] = value - Number(row[i - 3]);
            locationData.ppm.growthLast3Days[attribute] = this.ppm(name, value - Number(row[i - 3]));
        } else {
            locationData.absolute.growthLast3Days[attribute] = 0;
            locationData.ppm.growthLast3Days[attribute] = 0;
        }

        // absolute growth last 7 days
        if(i >= 11) {
            locationData.absolute.growthLast7Days[attribute] = value - Number(row[i - 7]);
            locationData.ppm.growthLast7Days[attribute] = this.ppm(name, value - Number(row[i - 7]));
        } else {
            locationData.absolute.growthLast7Days[attribute] = 0;
            locationData.ppm.growthLast7Days[attribute] = 0;
        }
    };

    ppm = (name, value) => {
        if(!Population.ABSOLUTE[name]) {
            // console.log("No population data for: " + name);
        }
        return 1000000 * value / Population.ABSOLUTE[name];
    };

    loadFromUrl = (url, callback) => {
        Papa.parse(url, {
            download: true,
            complete: async function (results) {
                callback(results);
            }
        });
    };
}
