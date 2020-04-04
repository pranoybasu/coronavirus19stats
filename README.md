## About

Hi, I'm Pranoy Basu

I wanted to see whether I can reproduce the Johns Hopkins map visualization of COVID19. Therefore I set out to build my own version using the very same live data source that they kindly provided in their GitHub repo .

The already available data was a big help for me as I could easily create the application in the react environment

## Features:

- project the confirmed cases at global average testing rate 
- display the momentum of the spread in glyphs directly, i.e. change over the last 1, 3 or 7 days
- containment score reflecting the spread of COVID19 in a region, based on weighted average growth of confirmed cases over the past 1, 3 and 7 days.
- replay mode to go back in time (also works in momentum mode)
- works with Johns Hopkins data version 1 and 2 (they changed their format on 03/23/2020)
- normalize data by population
- open source

Please check it out, and hopefully it helps to drive more ideas and to provide a better understanding of the situation we are currently facing. We are all in the same boat, help each other, stay healthy and don't forget to wash your hands!


## Users
Visit https://github.com/pranoybasu/coronavirus19stats

## Developers
### Install and run
```
npm install         # first time only
npm start
```

### Deploy to GitHub pages
```
npm run deploy      # Please do not forget to include link to license and mention the original author(s) as given below
```

# Contributors
- Pranoy Basu

## Attributions
### Data sources
- [Johns Hopkins COVID-19 data set](https://github.com/CSSEGISandData/COVID-19/tree/master/csse_covid_19_data/csse_covid_19_time_series)
- Testing rates:
  - [Countries](https://en.wikipedia.org/wiki/COVID-19_testing)
- Population data:
  - [Countries](https://population.un.org/wpp/Download/Files/1_Indicators%20(Standard)/CSV_FILES/WPP2019_TotalPopulationBySex.csv)