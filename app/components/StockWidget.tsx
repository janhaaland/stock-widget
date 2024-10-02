"use client"

import React, { useState, useEffect } from 'react'
import { ChevronLeft, Sun, Moon } from 'lucide-react'
import { Button } from "./ui/button"

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  data: {
    [key: string]: number[];
  };
}

interface ApiDataValue {
  close: string;
  // Add other properties if needed
}

const API_KEY = '373b09d6d6aa405885af770042c5bf87';
const BASE_CACHE_DURATION = 300000; // 5 minutes in milliseconds

const getCacheDuration = (index: number) => BASE_CACHE_DURATION * (index + 1);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchStockData = async (symbol: string, index: number): Promise<any> => {
  const cacheDuration = getCacheDuration(index);
  const cachedData = localStorage.getItem(`stock_${symbol}`);
  if (cachedData) {
    const { data, timestamp } = JSON.parse(cachedData);
    if (Date.now() - timestamp < cacheDuration) {
      return data;
    }
  }

  try {
    const response = await fetch(`https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=30&apikey=${API_KEY}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.status === 'error') {
      throw new Error(data.message || 'API returned an error');
    }
    localStorage.setItem(`stock_${symbol}`, JSON.stringify({ data, timestamp: Date.now() }));
    return data;
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    throw error;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformApiData = async (apiData: any): Promise<Stock> => {
  const values: ApiDataValue[] = apiData.values;
  const latestPrice = parseFloat(values[0].close);
  const previousPrice = parseFloat(values[1].close);
  const change = latestPrice - previousPrice;

  const companyName = await fetchCompanyName(apiData.meta.symbol);

  return {
    symbol: apiData.meta.symbol,
    name: companyName,
    price: latestPrice,
    change: change,
    data: {
      '1D': values.slice(0, 7).map((v: ApiDataValue) => parseFloat(v.close)).reverse(),
      '5D': values.slice(0, 5).map((v: ApiDataValue) => parseFloat(v.close)).reverse(),
      '1M': values.slice(0, 30).map((v: ApiDataValue) => parseFloat(v.close)).reverse(),
    }
  };
};

const fetchCompanyName = async (symbol: string): Promise<string> => {
  const cachedName = localStorage.getItem(`company_name_${symbol}`);
  if (cachedName) {
    return cachedName;
  }

  try {
    const response = await fetch(`https://api.twelvedata.com/symbol_search?symbol=${symbol}&apikey=${API_KEY}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.data && data.data.length > 0) {
      const name = data.data[0].instrument_name;
      localStorage.setItem(`company_name_${symbol}`, name);
      return name;
    }
    return symbol; // Fallback to symbol if name not found
  } catch (error) {
    console.error(`Error fetching company name for ${symbol}:`, error);
    return symbol; // Fallback to symbol if there's an error
  }
};

const StockGraph: React.FC<{ data: number[], expanded: boolean, trend: 'up' | 'down' }> = ({ data, expanded, trend }) => {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min
  const padding = range * 0.1 // Add 10% padding

  const points = data.map((value, index) => ({
    x: index * (100 / (data.length - 1)),
    y: 32 - ((value - (min - padding)) / (range + 2 * padding)) * 32
  }))

  const linePath = points.reduce((path, point, i) => {
    if (i === 0) {
      return `M ${point.x},${point.y}`
    }
    const prevPoint = points[i - 1]
    const controlPoint1 = {
      x: (prevPoint.x + point.x) / 2,
      y: prevPoint.y
    }
    const controlPoint2 = {
      x: (prevPoint.x + point.x) / 2,
      y: point.y
    }
    return `${path} C ${controlPoint1.x},${controlPoint1.y} ${controlPoint2.x},${controlPoint2.y} ${point.x},${point.y}`
  }, '')

  const gradientColor = trend === 'up' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'

  return (
    <svg className={`w-full ${expanded ? 'h-32' : 'h-8'}`} viewBox="0 0 100 34">
      <defs>
        <linearGradient id={`gradient-${trend}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={gradientColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={gradientColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${linePath} L 100,34 L 0,34 Z`}
        fill={`url(#gradient-${trend})`}
        stroke="none"
      />
      <path
        d={linePath}
        fill="none"
        stroke={gradientColor}
        strokeWidth={expanded ? "1" : "2"}
      />
    </svg>
  )
}

// Add this utility function at the top level of the file
const calculateTrend = (change: number): 'up' | 'down' => change >= 0 ? 'up' : 'down';

const StockItem: React.FC<{ stock: Stock, onSelect: () => void }> = ({ stock, onSelect }) => {
  const trend = calculateTrend(stock.change);

  return (
    <div className="cursor-pointer py-2" onClick={onSelect}>
      <div className="flex items-center">
        <div className="w-1/3">
          <div className="flex items-center">
            <div className={trend === 'up' ? "text-green-500 mr-2" : "text-red-500 mr-2"}>
              {trend === 'up' ? '▲' : '▼'}
            </div>
            <span className="font-bold">{stock.symbol}</span>
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{stock.name}</div>
        </div>
        <div className="w-1/3 px-2">
          <StockGraph data={stock.data['1D']} expanded={false} trend={trend} />
        </div>
        <div className="w-1/3 text-right">
          <div className="font-bold">{stock.price.toFixed(2)}</div>
          <div className={`text-sm ${trend === 'up' ? "text-green-500" : "text-red-500"}`}>
            {trend === 'up' ? '+' : ''}{Math.abs(stock.change).toFixed(2)} ({(Math.abs(stock.change) / stock.price * 100).toFixed(2)}%)
          </div>
        </div>
      </div>
    </div>
  )
}

const StockDetail: React.FC<{ stock: Stock, onBack: () => void }> = ({ stock, onBack }) => {
  const [activeTimeframe, setActiveTimeframe] = useState('1D')
  const timeframes = ['1D', '5D', '1M', '1Y', '5Y']

  const currentData = stock.data[activeTimeframe] || []
  const trend = calculateTrend(stock.change);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack} 
            aria-label="Go back"
            className="hover:bg-gray-100 dark:hover:bg-gray-700 hover:rounded-lg transition-all duration-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-2xl font-bold">{stock.symbol}</h2>
            <div className="text-gray-500 dark:text-gray-400 text-sm">{stock.name}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{stock.price.toFixed(2)}</div>
            <div className={`text-sm ${trend === 'up' ? "text-green-500" : "text-red-500"}`}>
              {trend === 'up' ? '+' : ''}{Math.abs(stock.change).toFixed(2)} ({(Math.abs(stock.change) / stock.price * 100).toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>
      <div className="flex-grow">
        {currentData.length > 0 ? (
          <StockGraph data={currentData} expanded={true} trend={trend} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No data available for this timeframe
          </div>
        )}
      </div>
      <div className="flex justify-start space-x-6 p-4">
        {timeframes.map((timeframe) => (
          <button
            key={timeframe}
            onClick={() => setActiveTimeframe(timeframe)}
            className={`px-2 py-1 text-sm font-medium rounded-md ${
              activeTimeframe === timeframe
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {timeframe}
          </button>
        ))}
      </div>
    </div>
  )
}

const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark')
    setIsDark(isDarkMode)
  }, [])

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    if (newIsDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light')
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="hover:bg-gray-100 dark:hover:bg-gray-700 hover:rounded-lg transition-all duration-200"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

// Update the SkeletonStockItem component
const SkeletonStockItem: React.FC = () => (
  <div className="py-2 animate-pulse">
    <div className="flex items-center">
      <div className="w-1/3">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded-full mr-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 mt-1"></div>
      </div>
      <div className="w-1/3 px-2">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      <div className="w-1/3 text-right">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 ml-auto mt-1"></div>
      </div>
    </div>
  </div>
);

export default function StockWidget() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const symbols = ['AAPL', 'GOOGL', 'AMZN', 'TSLA', 'META'];
    
    const fetchStockWithDelay = async (symbol: string, index: number) => {
      await new Promise(resolve => setTimeout(resolve, index * 2000)); // 2-second delay between each stock
      try {
        const data = await fetchStockData(symbol, index);
        const transformedStock = await transformApiData(data);
        return transformedStock;
      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        return null;
      }
    };

    const getStocks = async () => {
      setLoading(true);
      try {
        const fetchedStocks = await Promise.all(symbols.map(fetchStockWithDelay));
        const validStocks = fetchedStocks.filter((stock): stock is Stock => stock !== null);
        setStocks(validStocks);
      } catch (error) {
        console.error('Error in getStocks:', error);
        setError('Failed to fetch stock data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    getStocks();

    // Set up an interval to refresh the data
    const intervalId = setInterval(getStocks, BASE_CACHE_DURATION);

    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  if (error) {
    return <div className="w-[420px] h-[385px] mx-auto flex items-center justify-center text-red-500">{error}</div>;
  }

  return (
    <div className="w-[420px] h-[385px] mx-auto rounded-lg shadow-lg overflow-hidden bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 relative">
      {selectedStock ? (
        <StockDetail stock={selectedStock} onBack={() => setSelectedStock(null)} />
      ) : (
        <div className="h-full flex flex-col">
          <div className="p-4 flex justify-between items-center">
            <h1 className="text-xl font-bold">Watchlist</h1>
            <ThemeToggle />
          </div>
          <div className="px-4 flex-grow overflow-auto">
            {loading ? (
              // Display skeleton loading items
              <div className="flex flex-col h-full justify-between">
                {Array(5).fill(0).map((_, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <div className="border-b border-gray-200 dark:border-gray-700"></div>}
                    <div className="py-2">
                      <SkeletonStockItem />
                    </div>
                    {index === 4 && <div className="border-b border-gray-200 dark:border-gray-700"></div>}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              // Display actual stock items
              <div className="flex flex-col h-full justify-between">
                {stocks.map((stock, index) => (
                  <React.Fragment key={stock.symbol}>
                    {index > 0 && <div className="border-b border-gray-200 dark:border-gray-700"></div>}
                    <StockItem
                      stock={stock}
                      onSelect={() => setSelectedStock(stock)}
                    />
                    {index === stocks.length - 1 && <div className="border-b border-gray-200 dark:border-gray-700"></div>}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}