import yfinance as yf
import pandas as pd
import numpy as np

# Step 1: Fetch data from Yahoo Finance with a smaller interval (e.g., 1-hour)
ticker = 'BTC-USD'
data = yf.download(ticker, interval='1D')

# Step 2: Calculate the 20-period and 50-period SMAs (these are now 20-hour and 50-hour SMAs)
data['SMA20'] = data['Close'].rolling(window=20).mean()
data['SMA50'] = data['Close'].rolling(window=50).mean()

# Step 3: Generate trading signals
data['Signal'] = 0
cross_up = (data['SMA20'] > data['SMA50']) & (data['SMA20'].shift(1) <= data['SMA50'].shift(1))
cross_down = (data['SMA20'] < data['SMA50']) & (data['SMA20'].shift(1) >= data['SMA50'].shift(1))
data.loc[cross_up, 'Signal'] = 1
data.loc[cross_down, 'Signal'] = -1

# Ensure that Signal is set to 0 when there is no crossover
no_cross = ~(cross_up | cross_down)
data.loc[no_cross, 'Signal'] = 0

# Step 4: Calculate positions and equity
initial_cash = 1_000_000
data['Position'] = data['Signal'].shift(1)  # Previous day's signal determines today's position

data['Units'] = (data['Position'].diff().fillna(0) * initial_cash / data['Close']).cumsum()
data['Holdings'] = data['Units'] * data['Close']
data['Cash'] = initial_cash - (data['Units'].diff().fillna(0) * data['Close']).cumsum()

data['Equity'] = data['Holdings'] + data['Cash']

# Step 5: Convert Date to UNIX time and rename the column to 'time'
data.index = pd.to_datetime(data.index)
data['time'] = data.index.astype('int64') // 10**9  # This should correctly convert to UNIX time in seconds

# Reset the index and check the 'time' column
data.reset_index(drop=True, inplace=True)

# Replace NaN values
data.fillna(value={'SMA20': 0, 'SMA50': 0, 'Signal': 0, 'Units': 0, 'Holdings': 0, 'Cash': 0, 'Equity': 0, 'Volume': 0}, inplace=True)

# Save to CSV for inspection
data.to_csv('sma_crossover_strategy_corrected.csv', index=False)

# Display the DataFrame to check the 'time' column
print(data[['time', 'Close', 'Signal', 'Units', 'Holdings', 'Cash', 'Equity']].head())  # Check the first few rows to verify



# strategy.py
def main():
    global data

    # Select only required columns to be rendered in the data section 
    data = data[['time', 'Open', 'High', 'Low', 'Close', 'Volume', 'SMA20', 'SMA50', 'Signal', 'Holdings', 'Cash', 'Equity']]

    metadata = {
        'chart1': {'height': 60, 'timescale': False},  # Define the chart, its height, and timescale visibility
        'chart2': {'height': 20, 'timescale': False},  # Define the chart, its height, and timescale visibility
        'chart3': {'height': 20, 'timescale': False},  # Define the chart, its height, and timescale visibility
        'Date': {'plot': True, 'type': 'time'},
        'Open': {'plot': True, 'type': 'candlestick', 'component': 'open', 'chart': 1},
        'High': {'plot': True, 'type': 'candlestick', 'component': 'high', 'chart': 1},
        'Low': {'plot': True, 'type': 'candlestick', 'component': 'low', 'chart': 1},
        'Close': {'plot': True, 'type': 'candlestick', 'component': 'close', 'chart': 1},
        'SMA20': {'plot': True, 'type': 'line', 'overlay': True, 'color': '#f07b01', 'chart': 1},
        'SMA50': {'plot': True, 'type': 'line', 'overlay': True, 'color': '#2962ff', 'chart': 1},
        'Volume': {'plot': True, 'type': 'histogram', 'overlay': True, 'upColor': '#089981', 'downColor': '#f23645', 'chart': 1},
        'Equity' : {'plot': True, 'type': 'area', 'overlay': True, 'color': '#2962ff', 'chart': 2},
        'Holdings' : {'plot': True, 'type': 'line', 'overlay': True, 'color': '#2962ff', 'chart': 3},
        
    }

    # Ensure sizes are integers
    metadata['chart1']['height'] = int(metadata['chart1']['height'])
    metadata['chart2']['height'] = int(metadata['chart2']['height'])
    metadata['chart3']['height'] = int(metadata['chart3']['height'])
    # Return the metadata along with the data
    return data.to_dict(orient='records'), metadata


if __name__ == "__main__":
    final_results, metadata = main()
    print(final_results)  # Optionally print or log the data for debugging
    print(metadata)  # Optionally print or log the metadata for debugging
