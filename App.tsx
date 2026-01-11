
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Camera, Package, BarChart3, Plus, Trash2, 
  Search, AlertCircle, Save, X, Settings, 
  Star, ArrowUpDown, ImageIcon, Monitor, ChevronRight, Sun, Moon, Key, CheckCircle2, RefreshCcw
} from 'lucide-react';
import { Mart, InventoryItem, AnalysisResult, Tab } from './types';
import { analyzeMartImage } from './geminiService';

const App: React.FC = () => {
  // --- 테마 설정 ---
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('mm_theme');
    return saved ? saved === 'dark' : true; // 기본 다크모드
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('mm_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // --- States ---
  const [marts, setMarts] = useState<Mart[]>(() => {
    const saved = localStorage.getItem('mm_local_marts');
    return saved ? JSON.parse(saved) : [{ id: 1, name: '네이버스토어' }];
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('mm_local_inventory');
    return saved ? JSON.parse(saved) : [];
  });

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('mm_api_key') || "");
  const [tempApiKey, setTempApiKey] = useState("");
  const [showKeyConfirm, setShowKeyConfirm] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [selectedMartId, setSelectedMartId] = useState<number | 'all'>('all');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showAddMartModal, setShowAddMartModal] = useState(false);
  const [newMartName, setNewMartName] = useState("");
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[] | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // --- Persistent Storage ---
  useEffect(() => {
    localStorage.setItem('mm_local_marts', JSON.stringify(marts));
  }, [marts]);

  useEffect(() => {
    localStorage.setItem('mm_local_inventory', JSON.stringify(inventory));
  }, [inventory]);

  // --- Actions ---
  const handleSaveApiKey = () => {
    if (tempApiKey.trim()) {
      localStorage.setItem('mm_api_key', tempApiKey.trim());
      setApiKey(tempApiKey.trim());
      setTempApiKey("");
      setShowKeyConfirm(true);
      setTimeout(() => setShowKeyConfirm(false), 3000);
    }
  };

  const handleClearApiKey = () => {
    if (confirm("저장된 API 키를 삭제하시겠습니까?")) {
      localStorage.removeItem('mm_api_key');
      setApiKey("");
      setTempApiKey("");
    }
  };

  const frequentItems = useMemo(() => {
    return inventory.filter(item => item.isPinned).slice(0, 20);
  }, [inventory]);

  const priceComparison = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    inventory.forEach(item => {
      const name = item.name.trim().toLowerCase();
      if (!groups[name]) groups[name] = [];
      groups[name].push(item);
    });
    return Object.entries(groups)
      .filter(([_, items]) => items.length > 1)
      .map(([name, items]) => ({
        name: items[0].name,
        prices: items.map(i => ({
          martName: marts.find(m => m.id === i.martId)?.name || '알 수 없음',
          price: i.price,
          date: i.date
        })).sort((a, b) => a.price - b.price)
      }));
  }, [inventory, marts]);

  const addToInventory = (item: AnalysisResult) => {
    const targetMartId = selectedMartId === 'all' ? (marts[0]?.id || 1) : selectedMartId;
    const newItem: InventoryItem = {
      id: Date.now() + Math.random(),
      martId: targetMartId as number,
      name: item.name,
      price: Number(item.price),
      unit: item.unit,
      isPinned: false,
      date: new Date().toISOString().split('T')[0]
    };
    setInventory(prev => [newItem, ...prev]);
  };

  const removeFromInventory = (id: number) => {
    setInventory(prev => prev.filter(item => item.id !== id));
  };

  const togglePin = (id: number) => {
    setInventory(prev => prev.map(item => {
      if (item.id === id) {
        if (!item.isPinned && frequentItems.length >= 20) {
          setErrorMessage("자주 사용하는 품목은 최대 20개까지만 고정 가능합니다.");
          return item;
        }
        return { ...item, isPinned: !item.isPinned };
      }
      return item;
    }));
  };

  const handleConfirmAddMart = () => {
    if (newMartName && newMartName.trim()) {
      const newMart: Mart = { id: Date.now(), name: newMartName.trim() };
      setMarts([...marts, newMart]);
      setSelectedMartId(newMart.id);
      setNewMartName("");
      setShowAddMartModal(false);
    }
  };

  const processImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!process.env.API_KEY && !apiKey) {
      setErrorMessage("설정 탭에서 Google API 키를 먼저 등록해주세요.");
      setShowAiModal(true);
      return;
    }

    setIsAiLoading(true);
    setErrorMessage("");

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const results = await analyzeMartImage(base64);
        setAnalysisResults(results);
      } catch (err) {
        setErrorMessage("AI 분석 중 오류가 발생했습니다. API 키가 유효한지 확인해주세요.");
      } finally {
        setIsAiLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // --- Sub-Views ---
  const Dashboard = () => (
    <div className="p-4 space-y-6">
      {frequentItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-black text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Star size={14} className="fill-yellow-400 text-yellow-400" /> 즐겨찾기
            </h3>
          </div>
          <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
            {frequentItems.map(item => (
              <div key={item.id} className="bg-white dark:bg-[#1C1F26] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 min-w-[140px] flex-shrink-0 transition-transform active:scale-95">
                <p className="font-black text-gray-800 dark:text-gray-200 text-xs truncate">{item.name}</p>
                <p className="text-indigo-600 dark:text-indigo-400 font-black text-sm mt-1">{item.price.toLocaleString()}원</p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1 truncate">{marts.find(m => m.id === item.martId)?.name || '기본마트'}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {priceComparison.length > 0 && (
        <section className="bg-white dark:bg-[#1C1F26] p-5 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
          <h3 className="font-black text-sm text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <ArrowUpDown size={14} className="text-indigo-500" /> 최저가 비교 리포트
          </h3>
          <div className="space-y-4">
            {priceComparison.slice(0, 5).map((compare, idx) => (
              <div key={idx} className="border-b border-gray-50 dark:border-gray-800 pb-3 last:border-0">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">{compare.name}</p>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{compare.prices[0].martName}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-bold">최저가</span>
                    <span className="text-xs font-black text-gray-700 dark:text-gray-300">{compare.prices[0].price.toLocaleString()}원</span>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="bg-indigo-600 dark:bg-indigo-500 p-8 rounded-[2.5rem] text-white shadow-2xl flex justify-between items-center relative overflow-hidden group active:scale-[0.98] transition-all cursor-pointer" onClick={() => setShowAiModal(true)}>
        <div className="z-10">
          <h4 className="font-black text-xl">AI 스마트 인식</h4>
          <p className="text-indigo-100 text-sm mt-1">사진 한 장으로 가격 등록</p>
        </div>
        <div className="bg-white dark:bg-gray-100 text-indigo-600 p-5 rounded-2xl shadow-xl z-10">
          <Camera size={32} />
        </div>
        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-indigo-500 dark:bg-indigo-400 rounded-full opacity-20 group-hover:scale-110 transition-transform"></div>
      </div>
    </div>
  );

  const InventoryView = () => (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-black text-lg text-gray-800 dark:text-gray-200">장부 내역</h3>
        <button 
          onClick={() => setShowAddMartModal(true)}
          className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
        >
          <Plus size={16} /> 마트 추가
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button 
          onClick={() => setSelectedMartId('all')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all ${selectedMartId === 'all' ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-lg' : 'bg-white dark:bg-[#1C1F26] text-gray-400 dark:text-gray-500 shadow-sm border border-gray-100 dark:border-gray-800'}`}
        >
          전체 보기
        </button>
        {marts.map(mart => (
          <button 
            key={mart.id}
            onClick={() => setSelectedMartId(mart.id)}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all ${selectedMartId === mart.id ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-lg' : 'bg-white dark:bg-[#1C1F26] text-gray-400 dark:text-gray-500 shadow-sm border border-gray-100 dark:border-gray-800'}`}
          >
            {mart.name}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" size={18} />
        <input 
          type="text" 
          placeholder="저장된 식자재 검색..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-[#1C1F26] rounded-3xl border-none shadow-sm focus:ring-2 focus:ring-indigo-400 dark:text-gray-200 text-sm font-medium"
        />
      </div>

      <div className="space-y-3">
        {inventory
          .filter(item => (selectedMartId === 'all' || item.martId === selectedMartId))
          .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .map(item => (
            <div key={item.id} className="bg-white dark:bg-[#1C1F26] p-5 rounded-[2rem] flex justify-between items-center shadow-sm border border-gray-100 dark:border-gray-800 hover:border-indigo-100 dark:hover:border-indigo-900 transition-all group">
              <div className="flex items-center gap-4 flex-1 overflow-hidden">
                <button 
                  onClick={() => togglePin(item.id)} 
                  className={`shrink-0 p-2 rounded-xl transition-all ${item.isPinned ? 'text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-200 dark:text-gray-700 bg-gray-50 dark:bg-gray-800/50'}`}
                >
                  <Star size={20} fill={item.isPinned ? "currentColor" : "none"} />
                </button>
                <div className="overflow-hidden">
                  <p className="font-black text-gray-800 dark:text-gray-200 text-sm truncate">{item.name}</p>
                  <div className="flex gap-2 mt-1 items-center">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md">
                      {item.price.toLocaleString()}원
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">/ {item.unit}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right shrink-0">
                  <p className="text-[9px] font-bold text-gray-300 dark:text-gray-600 uppercase leading-none mb-1">
                    {marts.find(m => m.id === item.martId)?.name}
                  </p>
                  <p className="text-[8px] text-gray-400 dark:text-gray-500">{item.date}</p>
                </div>
                <button onClick={() => removeFromInventory(item.id)} className="text-gray-200 dark:text-gray-700 hover:text-red-400 p-2 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {inventory.length === 0 && (
            <div className="py-20 text-center opacity-30 dark:opacity-10 grayscale">
              <Package size={64} className="mx-auto mb-4" />
              <p className="font-bold text-sm">아직 등록된 품목이 없습니다</p>
            </div>
          )}
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto bg-[#F9FAFB] dark:bg-[#0F1115] min-h-screen pb-32 font-sans relative theme-transition">
      <header className="bg-white/80 dark:bg-[#0F1115]/80 backdrop-blur-xl p-6 sticky top-0 z-30 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-600 dark:bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-200 dark:shadow-none font-black text-xl">M</div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Mart Manager</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">AI Live Care</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-3 rounded-2xl transition-all text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-[#1C1F26] hover:text-indigo-600"
          >
            {isDark ? <Sun size={22} /> : <Moon size={22} />}
          </button>
          <button 
            onClick={() => setActiveTab(Tab.SETTINGS)} 
            className={`p-3 rounded-2xl transition-all ${activeTab === Tab.SETTINGS ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-[#1C1F26]'}`}
          >
            <Settings size={22} />
          </button>
        </div>
      </header>

      <main className="animate-in fade-in duration-500">
        {activeTab === Tab.DASHBOARD && <Dashboard />}
        {activeTab === Tab.INVENTORY && <InventoryView />}
        {activeTab === Tab.SETTINGS && (
          <div className="p-6 space-y-6">
            <div className="bg-white dark:bg-[#1C1F26] p-8 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-8">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-xl text-gray-900 dark:text-gray-100">AI 모델 설정</h3>
                  {apiKey && (
                    <button 
                      onClick={handleClearApiKey}
                      className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors"
                      title="API 키 삭제"
                    >
                      <RefreshCcw size={16} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">인식 기능을 사용하려면 Google API 키가 필요합니다.</p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Key size={12} /> Google API Key
                    </label>
                    {apiKey && (
                      <span className="text-[9px] font-black text-green-500 flex items-center gap-1">
                        <CheckCircle2 size={10} /> 키 등록됨
                      </span>
                    )}
                  </div>
                  <input 
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder={apiKey ? "••••••••••••••••" : "API 키를 입력하세요"}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 dark:text-white font-mono text-xs shadow-inner"
                  />
                </div>

                <button 
                  onClick={handleSaveApiKey}
                  disabled={!tempApiKey.trim()}
                  className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${tempApiKey.trim() ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-lg shadow-indigo-100 dark:shadow-none active:scale-95' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}`}
                >
                  <Save size={18} /> 설정 저장하기
                </button>

                {showKeyConfirm && (
                  <p className="text-center text-green-500 text-[10px] font-black animate-in fade-in">성공적으로 저장되었습니다!</p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-[#1C1F26] p-8 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm">
              <h3 className="font-black text-xl text-gray-900 dark:text-gray-100 mb-2">데이터 요약</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-8 font-medium">기기 내부 로컬 저장소 통계입니다.</p>
              
              <div className="space-y-4">
                <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase">인식된 상품 수</p>
                    <p className="text-2xl font-black text-indigo-900 dark:text-indigo-200 mt-1">{inventory.length}</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                    <Package className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>

                <button 
                  onClick={() => {
                    if (confirm("정말 모든 데이터를 삭제하시겠습니까?")) {
                      setInventory([]);
                      setMarts([{ id: 1, name: '네이버스토어' }]);
                      localStorage.clear();
                      setApiKey("");
                      window.location.reload();
                    }
                  }}
                  className="w-full py-5 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-3xl font-black text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                  데이터 전체 초기화
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Nav */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[calc(448px-48px)] bg-white/90 dark:bg-[#1C1F26]/90 backdrop-blur-2xl border border-gray-100 dark:border-gray-800 flex justify-around p-4 z-40 shadow-2xl rounded-[2.5rem]">
        {[
          {id: Tab.DASHBOARD, icon: BarChart3, label: '통계'},
          {id: Tab.INVENTORY, icon: Package, label: '장부'},
          {id: Tab.SETTINGS, icon: Settings, label: '설정'}
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            className={`flex flex-col items-center gap-1.5 transition-all w-16 ${activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-gray-300 dark:text-gray-600 hover:text-gray-400'}`}
          >
            <tab.icon size={24} strokeWidth={activeTab === tab.id ? 3 : 2} />
            <span className="text-[10px] font-black tracking-tight">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Mart Modal */}
      {showAddMartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1C1F26] w-full rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-black text-2xl mb-2 dark:text-gray-100">구매처 등록</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 font-medium">자주 방문하는 마트 이름을 입력해주세요.</p>
            <input 
              type="text"
              autoFocus
              value={newMartName}
              onChange={(e) => setNewMartName(e.target.value)}
              placeholder="예: 이마트, 식자재마트, 코스트코 등"
              className="w-full px-6 py-5 bg-gray-50 dark:bg-gray-800 border-none rounded-3xl focus:ring-2 focus:ring-indigo-500 mb-8 font-bold text-lg dark:text-white"
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmAddMart()}
            />
            <div className="flex gap-4">
              <button onClick={() => { setShowAddMartModal(false); setNewMartName(""); }} className="flex-1 py-5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-3xl font-bold">취소</button>
              <button onClick={handleConfirmAddMart} className="flex-1 py-5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-3xl font-black shadow-lg shadow-indigo-100 dark:shadow-none">등록하기</button>
            </div>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="bg-white dark:bg-[#1C1F26] w-full max-w-md rounded-t-[3rem] sm:rounded-[4rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-32 duration-300">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20">
              <div>
                <h3 className="font-black text-xl text-gray-900 dark:text-gray-100">AI 인식 모드</h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">Gemini 3 Flash Powered</p>
              </div>
              <button onClick={() => {setShowAiModal(false); setErrorMessage(""); setAnalysisResults(null);}} className="p-3 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-2xl shadow-sm"><X size={24} /></button>
            </div>
            
            <div className="p-8">
              {!isAiLoading && !analysisResults && (
                <div className="space-y-6">
                  <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-3xl space-y-2">
                    <p className="text-[10px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest">저장될 마트 선택</p>
                    <select 
                      value={selectedMartId === 'all' ? (marts[0]?.id || 1) : selectedMartId} 
                      onChange={(e) => setSelectedMartId(Number(e.target.value))}
                      className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl py-4 px-5 shadow-sm text-sm font-bold focus:ring-2 focus:ring-indigo-400 dark:text-gray-200"
                    >
                      {marts.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={() => cameraInputRef.current?.click()}
                      className="group flex items-center gap-5 p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[2.5rem] active:scale-95 transition-all shadow-sm hover:shadow-md"
                    >
                      <div className="w-14 h-14 bg-indigo-600 dark:bg-indigo-500 text-white rounded-[1.5rem] flex items-center justify-center group-hover:rotate-12 transition-transform shadow-xl shadow-indigo-100 dark:shadow-none"><Camera size={24}/></div>
                      <div className="text-left">
                        <p className="font-black text-base text-gray-900 dark:text-gray-100 leading-none">카메라로 바로 찍기</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-bold mt-1.5">진열대 앞에서 실시간 등록</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => galleryInputRef.current?.click()}
                      className="group flex items-center gap-5 p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[2.5rem] active:scale-95 transition-all shadow-sm hover:shadow-md"
                    >
                      <div className="w-14 h-14 bg-emerald-600 dark:bg-emerald-500 text-white rounded-[1.5rem] flex items-center justify-center group-hover:rotate-12 transition-transform shadow-xl shadow-emerald-100 dark:shadow-none"><ImageIcon size={24}/></div>
                      <div className="text-left">
                        <p className="font-black text-base text-gray-900 dark:text-gray-100 leading-none">이미지/캡처 업로드</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-bold mt-1.5">영수증이나 갤러리 사진 분석</p>
                      </div>
                    </button>
                  </div>

                  <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={processImage} />
                  <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" onChange={processImage} />
                </div>
              )}

              {isAiLoading && (
                <div className="py-16 text-center space-y-8">
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-4 border-4 border-indigo-200 dark:border-indigo-900 border-b-transparent rounded-full animate-spin-slow"></div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-900 dark:text-gray-100 text-lg font-black tracking-tight">AI가 사진을 분석 중입니다</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-bold px-10 leading-relaxed uppercase">수 초 내에 상품명, 가격, 단위를 자동 추출합니다.</p>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="py-10 text-center space-y-6">
                  <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-red-50/50 dark:ring-red-900/10"><AlertCircle size={40} /></div>
                  <div className="space-y-2">
                    <p className="text-red-600 dark:text-red-400 font-black px-4 text-base break-keep">분석에 실패했습니다</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-bold px-8">{errorMessage}</p>
                  </div>
                  <button onClick={() => setErrorMessage("")} className="w-full py-5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-black rounded-3xl">다시 시도하기</button>
                </div>
              )}

              {analysisResults && (
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 no-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-end mb-4 px-1">
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">분석된 항목 ({analysisResults.length})</p>
                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">전체 저장</p>
                  </div>
                  {analysisResults.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-5 bg-indigo-50/30 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-50 dark:border-indigo-900/30 group hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl transition-all hover:-translate-y-1">
                      <div className="flex-1 mr-4 overflow-hidden">
                        <p className="font-black text-gray-900 dark:text-gray-100 text-sm truncate">{item.name}</p>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-black mt-1 uppercase leading-none">
                          {item.price.toLocaleString()}원 <span className="text-gray-300 dark:text-gray-600 ml-1">/</span> <span className="text-gray-500 dark:text-gray-400">{item.unit}</span>
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          addToInventory(item);
                          setAnalysisResults(prev => prev ? prev.filter(i => i !== item) : null);
                          if (analysisResults.length <= 1) setShowAiModal(false);
                        }} 
                        className="p-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-[1.2rem] shadow-lg shadow-indigo-100 dark:shadow-none active:scale-90 transition-transform"
                      >
                        <Save size={18} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      analysisResults.forEach(item => addToInventory(item));
                      setShowAiModal(false);
                      setAnalysisResults(null);
                    }}
                    className="w-full py-5 bg-gray-900 dark:bg-indigo-500 text-white rounded-3xl font-black text-sm mt-4 shadow-2xl active:scale-[0.98] transition-all"
                  >
                    확인된 모든 품목 저장
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
