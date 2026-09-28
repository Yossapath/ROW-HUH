const fs = require('fs');
let code = fs.readFileSync('components/auction/AuctionQueuesView.tsx', 'utf8');

const targetButtons = `<div className="flex justify-end gap-2">
                                          {res.status !== "won" && (
                                            <button 
                                              onClick={() => awardMutation.mutate(res)}
                                              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded"
                                            >
                                              ได้รับของ
                                            </button>
                                          )}
                                          <button 
                                            onClick={() => cancelMutation.mutate(res.id)}
                                            className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
                                          >
                                            ลบทิ้ง
                                          </button>
                                        </div>`;

const replaceButtons = `<div className="flex flex-wrap justify-end gap-2">
                                          {res.status !== "won" && (
                                            <button 
                                              onClick={() => awardMutation.mutate(res)}
                                              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors shadow-sm"
                                            >
                                              ได้รับของ
                                            </button>
                                          )}
                                          {res.status !== "won" && index < (queue || []).length - 1 && (
                                            <button 
                                              onClick={() => {
                                                const newQueue = [...(queue || [])];
                                                const temp = newQueue[index];
                                                newQueue[index] = newQueue[index + 1];
                                                newQueue[index + 1] = temp;
                                                queryClient.setQueryData(["auction_queue", selectedAuctionId], newQueue);
                                                reorderMutation.mutate(newQueue.map(q => q.id));
                                              }}
                                              className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors shadow-sm"
                                            >
                                              ข้ามคิว
                                            </button>
                                          )}
                                          <button 
                                            onClick={() => cancelMutation.mutate(res.id)}
                                            className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors shadow-sm"
                                          >
                                            สละคิว
                                          </button>
                                        </div>`;

code = code.replace(targetButtons, replaceButtons);
fs.writeFileSync('components/auction/AuctionQueuesView.tsx', code);
