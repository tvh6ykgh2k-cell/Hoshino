import React from 'react';

export default function App() {
  return (
    <div className="h-screen flex">
      <aside className="w-60 bg-gray-800 border-r border-gray-700 p-4">
        <h1 className="text-lg font-bold text-white mb-4">⭐ Hoshino</h1>
        <p className="text-sm text-gray-400">加载中...</p>
      </aside>
      <main className="flex-1 flex flex-col">
        <div className="flex-1 p-6 flex items-center justify-center">
          <p className="text-gray-500 text-lg">Hoshino 准备就绪</p>
        </div>
        <div className="p-4 border-t border-gray-700">
          <input
            type="text"
            placeholder="输入消息..."
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            disabled
          />
        </div>
      </main>
    </div>
  );
}
