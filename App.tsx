import React, { useState, useMemo, Fragment } from 'react';
import { 
  ClipboardList, 
  Search, 
  Trash2, 
  LayoutGrid, 
  List, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  Package, 
  ChevronDown, 
  ChevronUp,
  Download,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
interface SubItem {
  codMat: string;
  descMat: string;
  vmi: string;
  status: string;
}

interface WMSData {
  id: string;
  demanda: string;
  codMat: string;
  descMat: string;
  vmi: string;
  status: string;
  quantity: number;
  subItems: SubItem[];
}

interface TeamStats {
  vmi1: number;
  vmi2: number;
  vmi3: number;
  total: number;
}

export default function App() {
  const [rawData, setRawData] = useState('');
  const [items, setItems] = useState<WMSData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<'All' | 'VMI 1' | 'VMI 2' | 'VMI 3'>('All');
  const [isInputVisible, setIsInputVisible] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Process data from textarea
  const processData = () => {
    if (!rawData.trim()) return;

    const lines = rawData.split('\n');
    const processed: WMSData[] = [];

    lines.forEach((line) => {
      if (!line.trim()) return;

      const cols = line.split('\t').map(c => c.trim());
      if (cols.length < 2) return;

      const demanda = cols[0] || '';
      const statusRaw = line.toLowerCase();
      const status = statusRaw.includes('não retornado') ? 'não retornado' : 
                     statusRaw.includes('#n/a') ? '#N/A' : '';
      
      const vmiMatch = line.match(/VMI\s*[1-3]/i);
      const vmi = vmiMatch ? vmiMatch[0].toUpperCase() : 'VMI 1';

      const dataCols = cols.slice(1).filter(c => {
        const val = c.toLowerCase();
        return !val.includes('#value') && 
               !val.includes('retornado') && 
               !val.includes('#n/a') && 
               !val.match(/vmi\s*[1-3]/i) && 
               val !== '';
      });

      // Identify Code (pattern like 14120463-00)
      const codMat = dataCols.find(c => c.match(/\d{5,10}-\d{1,4}/)) || '';
      
      // Identify Description (the first item that isn't the code)
      const descMat = dataCols.find(c => c !== codMat) || '';

      const isValidStatus = status !== '' || statusRaw.includes('#n/a');
      
      if (isValidStatus && demanda) {
        const existingItem = processed.find(item => item.demanda === demanda);

        if (existingItem) {
          existingItem.quantity += 1;
          existingItem.subItems.push({
            codMat,
            descMat: (descMat.toUpperCase() === '#VALUE!' || !descMat) ? 'Descrição Indisponível' : descMat,
            vmi,
            status: status || '#N/A'
          });
        } else {
          processed.push({
            id: Math.random().toString(36).substr(2, 9),
            demanda,
            codMat,
            descMat: (descMat.toUpperCase() === '#VALUE!' || !descMat) ? 'Descrição Indisponível' : descMat,
            vmi,
            status: status || '#N/A',
            quantity: 1,
            subItems: []
          });
        }
      }
    });

    setItems(processed);
    setIsInputVisible(false);
    setRawData('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const clearData = () => {
    setItems([]);
    setRawData('');
    setIsInputVisible(true);
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        item.demanda.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codMat.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descMat.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTeam = selectedTeam === 'All' || item.vmi === selectedTeam;
      
      return matchesSearch && matchesTeam;
    });
  }, [items, searchTerm, selectedTeam]);

  const stats = useMemo<TeamStats>(() => {
    return items.reduce((acc, item) => {
      if (item.vmi === 'VMI 1') acc.vmi1++;
      if (item.vmi === 'VMI 2') acc.vmi2++;
      if (item.vmi === 'VMI 3') acc.vmi3++;
      acc.total++;
      return acc;
    }, { vmi1: 0, vmi2: 0, vmi3: 0, total: 0 });
  }, [items]);

  return (
    <div className="min-h-screen bg-apple-gray-900 text-apple-gray-800 font-sans selection:bg-apple-blue/30">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-white/5 px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-apple-blue rounded-xl flex items-center justify-center shadow-lg shadow-apple-blue/20">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">LCSLogi</h1>
              <p className="text-[10px] text-apple-gray-200 font-bold uppercase tracking-[0.2em] opacity-60">VMI Intelligence</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 no-scrollbar"
          >
            <StatCard label="VMI 1" count={stats.vmi1} active={selectedTeam === 'VMI 1'} />
            <StatCard label="VMI 2" count={stats.vmi2} active={selectedTeam === 'VMI 2'} />
            <StatCard label="VMI 3" count={stats.vmi3} active={selectedTeam === 'VMI 3'} />
            <div className="w-px h-8 bg-white/10 mx-2" />
            <StatCard label="Total" count={stats.total} active={selectedTeam === 'All'} />
          </motion.div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10 space-y-8">
        {/* Input Section */}
        <section className="glass rounded-3xl overflow-hidden border border-white/5">
          <button 
            onClick={() => setIsInputVisible(!isInputVisible)}
            className="w-full px-8 py-6 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-apple-blue" />
              <span className="font-medium text-lg text-white">Importar do WMS</span>
            </div>
            <motion.div
              animate={{ rotate: isInputVisible ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <ChevronDown className="w-5 h-5 text-apple-gray-200" />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {isInputVisible && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-8 pb-8 space-y-6">
                  <div className="relative group">
                    <textarea
                      value={rawData}
                      onChange={(e) => setRawData(e.target.value)}
                      placeholder="Cole aqui os dados da sua planilha..."
                      className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-6 font-mono text-sm text-white focus:ring-4 focus:ring-apple-blue/20 focus:border-apple-blue outline-none transition-all placeholder:text-apple-gray-200/30 resize-none"
                    />
                    <div className="absolute bottom-4 right-4 flex gap-2">
                      <button 
                        onClick={() => setRawData('')}
                        className="p-3 hover:bg-white/10 rounded-full text-apple-gray-200 hover:text-red-400 transition-all"
                        title="Limpar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end items-center gap-4">
                    {items.length > 0 && (
                      <button 
                        onClick={clearData}
                        className="text-sm font-medium text-apple-gray-200 hover:text-white transition-colors"
                      >
                        Limpar atual
                      </button>
                    )}
                    <button 
                      onClick={processData}
                      disabled={!rawData.trim()}
                      className="px-8 py-3 bg-apple-blue text-white hover:bg-blue-500 disabled:opacity-20 disabled:cursor-not-allowed rounded-full font-semibold transition-all shadow-[0_0_15px_rgba(0,113,227,0.4)] hover:shadow-[0_0_20px_rgba(0,113,227,0.6)] active:scale-95"
                    >
                      Processar
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Filters & Actions */}
        <motion.div 
          layout
          className="flex flex-col lg:flex-row gap-6 items-center justify-between"
        >
          <div className="relative w-full lg:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-apple-gray-200/50 group-focus-within:text-apple-blue transition-colors" />
            <input 
              type="text"
              placeholder="Buscar demanda ou material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-4 focus:ring-apple-blue/20 focus:border-apple-blue outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-2xl w-full lg:w-auto overflow-x-auto no-scrollbar border border-white/5">
            {(['All', 'VMI 1', 'VMI 2', 'VMI 3'] as const).map((team) => (
              <button
                key={team}
                onClick={() => setSelectedTeam(team)}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  selectedTeam === team 
                    ? 'bg-white/10 text-white shadow-lg' 
                    : 'text-apple-gray-200/60 hover:text-white'
                }`}
              >
                {team === 'All' ? 'Todos' : team}
              </button>
            ))}
            <div className="w-px h-6 bg-white/10 mx-2" />
            <div className="flex gap-1">
              <button 
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white/10 text-apple-blue' : 'text-apple-gray-200/60 hover:text-white'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white/10 text-apple-blue' : 'text-apple-gray-200/60 hover:text-white'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Content Area */}
        <section className="min-h-[500px]">
          <AnimatePresence mode="wait">
            {items.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-32 text-apple-gray-200 space-y-6 bg-white/5 rounded-[2.5rem] border-2 border-dashed border-white/5"
              >
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                  <ClipboardList className="w-10 h-10 opacity-20" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-xl font-medium text-white">Pronto para processar</p>
                  <p className="text-sm max-w-xs mx-auto opacity-40">Cole seus dados do WMS acima para organizar suas demandas VMI.</p>
                </div>
              </motion.div>
            ) : filteredItems.length === 0 ? (
              <motion.div 
                key="no-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-32 text-apple-gray-200 space-y-4"
              >
                <Search className="w-12 h-12 opacity-10" />
                <p className="text-lg font-medium">Nenhum resultado para sua busca</p>
                <button 
                  onClick={() => { setSearchTerm(''); setSelectedTeam('All'); }}
                  className="text-apple-blue font-medium hover:underline text-sm"
                >
                  Limpar filtros
                </button>
              </motion.div>
            ) : viewMode === 'table' ? (
              <motion.div 
                key="table"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white/5 rounded-[2rem] border border-white/5 overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-apple-gray-200 text-[11px] uppercase tracking-[0.15em] font-bold">
                        <th className="px-8 py-5">Demanda</th>
                        <th className="px-8 py-5">Código</th>
                        <th className="px-8 py-5">Descrição</th>
                        <th className="px-8 py-5 text-center">Qtd</th>
                        <th className="px-8 py-5">Time</th>
                        <th className="px-8 py-5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredItems.map((item, idx) => (
                        <Fragment key={item.id}>
                          <motion.tr 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="hover:bg-white/5 transition-colors group"
                          >
                            <td className="px-8 py-5 font-mono text-sm text-apple-blue font-semibold">{item.demanda}</td>
                            <td className="px-8 py-5 font-mono text-sm text-white/90">{item.codMat}</td>
                            <td className="px-8 py-5 text-sm text-apple-gray-200 max-w-md">
                              <div className="flex items-center justify-between gap-4 group/desc">
                                <span className="truncate font-medium text-white/80" title={item.descMat}>{item.descMat}</span>
                                <button 
                                  onClick={() => copyToClipboard(item.descMat)}
                                  className="opacity-0 group-hover/desc:opacity-100 p-2 hover:bg-white/10 rounded-full transition-all text-apple-gray-200 hover:text-apple-blue"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-center">
                              {item.quantity > 1 ? (
                                <button 
                                  onClick={() => toggleExpand(item.id)}
                                  className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-apple-blue text-white hover:bg-blue-500 transition-colors cursor-pointer"
                                  title="Ver outros itens"
                                >
                                  {item.quantity} {expandedItems.has(item.id) ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                                </button>
                              ) : (
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-apple-gray-200">
                                  1
                                </span>
                              )}
                            </td>
                            <td className="px-8 py-5">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                item.vmi === 'VMI 1' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                item.vmi === 'VMI 2' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                item.vmi === 'VMI 3' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-white/10 text-apple-gray-200'
                              }`}>
                                {item.vmi}
                              </span>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-2 text-[11px] font-medium text-apple-gray-200">
                                <div className={`w-1.5 h-1.5 rounded-full ${item.status.includes('não retornado') ? 'bg-amber-400' : 'bg-white/20'}`} />
                                <span className="capitalize">{item.status || 'Pendente'}</span>
                              </div>
                            </td>
                          </motion.tr>
                          <AnimatePresence>
                            {expandedItems.has(item.id) && item.subItems.length > 0 && (
                              <motion.tr 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-black/20"
                              >
                                <td colSpan={6} className="p-0">
                                  <div className="px-8 py-4 border-l-2 border-apple-blue ml-8 space-y-3">
                                    <p className="text-xs font-bold text-apple-gray-200/50 uppercase tracking-wider mb-2">Itens Agrupados</p>
                                    {item.subItems.map((sub, i) => (
                                      <div key={i} className="flex items-center gap-6 text-sm">
                                        <span className="font-mono text-white/70 w-32">{sub.codMat}</span>
                                        <span className="text-apple-gray-200 flex-1 truncate" title={sub.descMat}>{sub.descMat}</span>
                                        <span className="text-apple-gray-200/50 w-24 text-xs capitalize">{sub.status || 'Pendente'}</span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </motion.tr>
                            )}
                          </AnimatePresence>
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredItems.map((item, idx) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    key={item.id}
                    className="bg-white/5 p-7 rounded-[2rem] border border-white/5 hover:bg-white/[0.08] transition-all group relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-apple-gray-200/40 uppercase tracking-[0.15em]">Demanda</p>
                        <div className="flex items-center gap-2">
                          <h3 className="text-apple-blue font-mono font-bold text-lg">{item.demanda}</h3>
                          {item.quantity > 1 && (
                            <button 
                              onClick={() => toggleExpand(item.id)}
                              className="px-2 py-0.5 bg-apple-blue text-white text-[9px] font-bold rounded-full flex items-center gap-1 hover:bg-blue-500 transition-colors"
                            >
                              {item.quantity}x {expandedItems.has(item.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.vmi === 'VMI 1' ? 'bg-blue-500/10 text-blue-400' :
                        item.vmi === 'VMI 2' ? 'bg-emerald-500/10 text-emerald-400' :
                        item.vmi === 'VMI 3' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-white/10 text-apple-gray-200'
                      }`}>
                        {item.vmi}
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-sm font-mono text-white/90 bg-black/20 p-3 rounded-xl">
                        <Package className="w-4 h-4 text-apple-gray-200/30" />
                        <span>{item.codMat}</span>
                      </div>
                      <p className="text-sm text-white/70 font-medium leading-relaxed line-clamp-3 min-h-[4.5rem]">
                        {item.descMat}
                      </p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-apple-gray-200/50">
                        <div className={`w-2 h-2 rounded-full ${item.status.includes('não retornado') ? 'bg-amber-400' : 'bg-white/10'}`} />
                        <span className="capitalize">{item.status || 'Pendente'}</span>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(item.descMat)}
                        className="p-2.5 bg-white/5 hover:bg-apple-blue hover:text-white rounded-full text-apple-gray-200 transition-all active:scale-90"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>

                    <AnimatePresence>
                      {expandedItems.has(item.id) && item.subItems.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-6 pt-4 border-t border-white/5 space-y-3"
                        >
                          <p className="text-[10px] font-bold text-apple-gray-200/40 uppercase tracking-wider">Itens Agrupados</p>
                          {item.subItems.map((sub, i) => (
                            <div key={i} className="bg-black/20 rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs text-white/70">{sub.codMat}</span>
                                <span className="text-[10px] text-apple-gray-200/50 capitalize">{sub.status || 'Pendente'}</span>
                              </div>
                              <p className="text-xs text-apple-gray-200 line-clamp-2">{sub.descMat}</p>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-8 py-16 border-t border-white/5 mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-apple-gray-200/30 text-xs font-medium">
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4" />
            <span className="tracking-wide">LCSLogi VMI Intelligence</span>
          </div>
          <div className="flex gap-8">
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Cloud Sync Active
            </span>
            <span className="opacity-50">v1.2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ label, count, active }: { label: string, count: number, active: boolean }) {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className={`flex flex-col px-6 py-3 rounded-2xl border transition-all min-w-[120px] ${
        active 
          ? 'bg-white/10 border-apple-blue shadow-lg shadow-apple-blue/10' 
          : 'bg-white/5 border-white/5'
      }`}
    >
      <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${active ? 'text-apple-blue' : 'text-apple-gray-200/40'}`}>
        {label}
      </span>
      <span className="text-2xl font-bold text-white mt-1">{count}</span>
    </motion.div>
  );
}
