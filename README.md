# quant_view

Hey everyone, I hope you enjoy this repo.

I wanted to make this since 2016. Its an easy way to add panes on a tradingview chart using whatever coding language. The example in this case is with python, but the idea is that you can code your strategy or indicators in any language.

You can plot any indicators signals or equity curves on a tradingview LWC. (I haven't tested it for zigzag and others a bit more exotic indicators, but I guess it should work fine)

Looks like this if everything goes well:
![image](https://github.com/user-attachments/assets/4288786f-72f7-4179-a53d-910374acdcb7)


It runs localy, and the only thing you need is to render the json data through the app.py(by simply running it) file on the tradingview chart which is the index and main files.

The tricky part is the main function within strategy.py but I think you guys will figure it out.

A few tips on when you build your strategy and for data preparation:

you see here (strategy.py line 34)

# Round other numerical columns
data['Close'] = data['Close'].round(2)  # Round Close price
data['Open'] = data['Open'].round(2)    # Round Open price
data['High'] = data['High'].round(2)    # Round High price
data['Low'] = data['Low'].round(2)      # Round Low price
data['Volume'] = data['Volume'].round(0)  # Volume might be an integer, so round to 0 decimal places

I rounded the numbers, mostly for aethetic purposes.

# Convert Date to UNIX time and rename the column to 'time'
data.index = pd.to_datetime(data.index)
data['time'] = data.index.astype('int64') // 10**9  # This should correctly convert to UNIX time in seconds

You also may need to convert your Date to Unix. Important is to name the Date dolume to "time" and run:

# Reset the index and check the 'time' column
data.reset_index(drop=True, inplace=True)

Also important is to run this:

# Replace NaN values
data.fillna(value={'SMA20': 0, 'SMA50': 0, 'Signal': 0, 'Units': 0, 'Holdings': 0, 'Cash': 0, 'Equity': 0, 'Volume': 0}, inplace=True)

As you can understand we fetch two things on the chart, data and metadata.

For the data we need to select which columns we want to render. This you will find in line 64 within def main.

For metadata you will have to pay attention on 4 things:

1. set up the heights of your charts when you add a new chart and include it in the metadata (a chart can also be a new pane, just make the timescale equal to False
2. when adding candlesticks and volume keep the structure as you see it in the example
3. for any other time series just choose the type (area, line, histogram), the color and on which chart/pane you want to plot it on.
4. Always use this script on line 76-81

***Important***

Always send out your data using "data" and "metadata" in the main function

If you want to plot your signals always use the "Signal" and the name for the series (same thing for Volume)
