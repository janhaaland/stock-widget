import StockWidget from './components/StockWidget';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 font-[family-name:var(--font-geist-sans)] bg-[#fafafa] dark:bg-gray-900">
      <StockWidget />
    </div>
  );
}
