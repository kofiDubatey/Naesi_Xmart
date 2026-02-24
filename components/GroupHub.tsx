
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Message, StudyGroup, Quiz, UserProfile } from '../types';
import { ICONS } from '../constants';

interface GroupHubProps {
  groups: StudyGroup[];
  availableQuizzes: Quiz[];
  onAwardPoints: (amount: number, reason: string) => void;
  currentUserId: string;
  currentUserName: string;
  isAdmin: boolean;
}

const GroupHub: React.FC<GroupHubProps> = ({ groups, availableQuizzes, onAwardPoints, currentUserId, currentUserName, isAdmin }) => {
  const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [viewMode, setViewMode] = useState<'chat' | 'leaderboard' | 'challenges' | 'members'>('chat');
  
  // Cluster Management State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Member & Discovery State
  const [groupMembers, setGroupMembers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [discoveredUsers, setDiscoveredUsers] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const activeGroup = useMemo(() => groups.find(g => g.id === activeGroupId), [groups, activeGroupId]);

  // Fetch group messages and subscribe
  useEffect(() => {
    if (!activeGroupId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('group_id', activeGroupId)
        .order('timestamp', { ascending: true });
      setMessages(data || []);
    };
    fetchMessages();
    fetchGroupMembers();

    const channel = supabase
      .channel(`group-${activeGroupId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `group_id=eq.${activeGroupId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeGroupId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, viewMode]);

  const fetchGroupMembers = async () => {
    if (!activeGroupId) return;
    const { data: memberJoins } = await supabase.from('group_members').select('user_id').eq('group_id', activeGroupId);
    if (memberJoins && memberJoins.length > 0) {
      const { data: users } = await supabase.from('profiles').select('*').in('id', memberJoins.map(m => m.user_id));
      setGroupMembers(users || []);
    }
  };

  const handleSearchUsers = async () => {
    if (searchQuery.length < 3) return;
    setIsSearching(true);
    const { data } = await supabase.from('profiles')
      .select('*')
      .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .limit(5);
    setDiscoveredUsers(data || []);
    setIsSearching(false);
  };

  const handleInviteUser = async (userId: string) => {
    if (!activeGroupId) return;
    const { error } = await supabase.from('group_members').insert({ group_id: activeGroupId, user_id: userId });
    if (!error) {
      fetchGroupMembers();
      onAwardPoints(10, "Cluster Expansion Initiated");
    } else {
      alert("USER_ALREADY_SYNCED: This node is already part of the cluster.");
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const { data: group, error: gError } = await supabase.from('groups').insert({
        name: newGroupName,
        admin_id: currentUserId,
        members: 1
      }).select().single();

      if (gError) throw gError;

      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: currentUserId
      });

      onAwardPoints(50, "New Cluster Initialized");
      window.location.reload(); // Quick refresh to update parent state
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
      setShowCreateModal(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeGroupId) return;
    
    const newMessage = {
      group_id: activeGroupId,
      sender_name: currentUserName,
      sender_id: currentUserId,
      text: inputText,
      timestamp: new Date().toISOString(),
      is_admin: isAdmin || activeGroup?.admin_id === currentUserId
    };
    
    const { error } = await supabase.from('messages').insert(newMessage);
    if (!error) {
      setInputText('');
      onAwardPoints(2, "Neural Transmission Logged");
    }
  };

  const handleBroadcastChallenge = async (quizId: string) => {
    if (!activeGroupId) return;
    const { error } = await supabase.from('groups').update({
      active_challenge: true,
      active_quiz_id: quizId
    }).eq('id', activeGroupId);

    if (!error) {
      onAwardPoints(30, "Tactical Challenge Broadcasted");
      alert("CHALLENGE_LIVE: All cluster nodes notified.");
    }
  };

  const leaderboardData = useMemo(() => {
    return groupMembers.sort((a, b) => b.points - a.points).map((u, i) => ({
      ...u, rank: i + 1
    }));
  }, [groupMembers]);

  return (
    <div className="min-h-[calc(100dvh-14rem)] flex flex-col xl:flex-row gap-4 md:gap-6 animate-in slide-in-from-right-4 duration-700">
      {/* Groups Sidebar: Node Cluster Directory */}
      <div className="w-full xl:w-80 glass rounded-[28px] md:rounded-[40px] border border-white/5 flex flex-col bg-slate-900/40 relative overflow-hidden max-h-[40dvh] xl:max-h-none">
        <div className="p-4 md:p-8 border-b border-white/5 bg-white/5">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
                <ICONS.Group className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold font-space text-[10px] text-white uppercase tracking-[0.3em]">Node_Clusters</h3>
             </div>
             <button 
               onClick={() => setShowCreateModal(true)}
               className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/40 transition-all"
             >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" /></svg>
             </button>
          </div>
          <p className="text-[9px] text-slate-500 mt-2 uppercase tracking-widest font-bold">Active Sync Channels</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 custom-scrollbar">
          {groups.map(group => (
            <button 
              key={group.id}
              onClick={() => setActiveGroupId(group.id)}
              className={`w-full p-5 rounded-3xl text-left transition-all relative group border ${activeGroupId === group.id ? 'bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.1)]' : 'bg-transparent border-white/5 hover:border-white/10 hover:bg-white/5'}`}
            >
              <div className="flex justify-between items-start mb-2 relative z-10">
                 <p className={`font-bold text-sm uppercase tracking-tight transition-colors ${activeGroupId === group.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{group.name}</p>
                 <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                    <span className="text-[10px] font-bold text-cyan-400 font-mono">{group.members}</span>
                    <ICONS.Group className="w-2.5 h-2.5 text-slate-500" />
                 </div>
              </div>
              <div className="flex items-center gap-2 relative z-10">
                 <div className={`w-1.5 h-1.5 rounded-full ${activeGroupId === group.id ? 'bg-cyan-400 animate-pulse' : 'bg-slate-700'}`}></div>
                 <span className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                    {activeGroupId === group.id ? 'Channel_Linked' : 'Ready'}
                 </span>
                 {group.activeChallenge && (
                    <span className="ml-auto text-[7px] bg-pink-500/10 text-pink-400 border border-pink-500/20 px-1.5 py-0.5 rounded uppercase font-bold">Challenge_Live</span>
                 )}
              </div>
            </button>
          ))}
          {groups.length === 0 && (
            <div className="py-10 text-center opacity-30">
               <p className="text-[9px] font-bold uppercase">No Clusters found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area: Sync Terminal */}
      <div className="flex-1 min-w-0 glass rounded-[28px] md:rounded-[40px] border border-white/5 flex flex-col overflow-hidden bg-slate-900/20 relative">
        <div className="p-4 md:p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 bg-white/5">
          <div>
            <div className="flex items-center gap-4">
              <h3 className="font-bold font-space text-lg md:text-2xl text-white uppercase tracking-tighter">{activeGroup?.name || 'Select_Cluster'}</h3>
              <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Active_Sync</span>
            </div>
          </div>
          
          <div className="w-full md:w-auto overflow-x-auto">
          <div className="flex min-w-max bg-slate-950/50 p-1.5 rounded-2xl border border-white/5 shadow-inner">
            {(['chat', 'challenges', 'leaderboard', 'members'] as const).map(mode => (
              <button 
                key={mode} 
                onClick={() => setViewMode(mode)}
                className={`px-3 md:px-6 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-[0.2em] transition-all relative ${viewMode === mode ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {mode}
              </button>
            ))}
          </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          {viewMode === 'chat' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 p-4 md:p-8 space-y-4 md:space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[92%] md:max-w-[75%] space-y-2 ${msg.sender_id === currentUserId ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 px-2">
                         {msg.sender_id !== currentUserId && <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">{msg.sender_name}</span>}
                      </div>
                      <div className={`p-4 md:p-5 rounded-[22px] md:rounded-[28px] ${msg.sender_id === currentUserId ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800/80 border border-white/5 text-slate-100 rounded-tl-none'}`}>
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="p-4 md:p-8 bg-slate-950/50 border-t border-white/5">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Transmit signal..."
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 md:px-8 py-4 md:py-5 focus:border-cyan-500 outline-none text-white placeholder:text-slate-600"
                />
              </form>
            </div>
          )}

          {viewMode === 'leaderboard' && (
            <div className="p-4 md:p-10 space-y-4">
              {leaderboardData.map((user, i) => (
                <div key={i} className={`flex items-center justify-between p-4 md:p-6 rounded-3xl border ${user.id === currentUserId ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-slate-900/50 border-white/5'}`}>
                   <div className="flex items-center gap-4 md:gap-6">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-bold font-space text-slate-500 border border-white/10">{user.rank}</div>
                      <div>
                         <p className="font-bold text-sm md:text-base text-white uppercase tracking-tight">{user.name}</p>
                         <p className="text-[9px] text-slate-500 font-bold">PROFICIENCY: {user.points} XP</p>
                      </div>
                   </div>
                   <ICONS.Stats className="w-5 h-5 text-cyan-500" />
                </div>
              ))}
            </div>
          )}

          {viewMode === 'challenges' && (
            <div className="p-4 md:p-10 space-y-8 md:space-y-10">
               <h4 className="text-sm font-bold font-space text-white uppercase tracking-[0.3em]">Tactical Broadcasts</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {availableQuizzes.filter(q => !q.completed).map(quiz => (
                    <div key={quiz.id} className="glass p-8 rounded-[35px] border border-pink-500/20 bg-pink-500/5 hover:border-pink-500/40 transition-all">
                       <h5 className="font-bold text-white text-lg mb-2 uppercase tracking-tight">{quiz.title}</h5>
                       <p className="text-[10px] text-slate-500 mb-6 uppercase tracking-widest">Active nodes: {quiz.questions.length}</p>
                       <button 
                         onClick={() => handleBroadcastChallenge(quiz.id)}
                         className="w-full py-4 bg-pink-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-pink-600/20"
                       >
                         Broadcast Challenge
                       </button>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {viewMode === 'members' && (
            <div className="p-4 md:p-10 space-y-8">
               <div className="glass p-4 md:p-8 rounded-[28px] md:rounded-[40px] border border-cyan-500/20 bg-cyan-500/5">
                  <h4 className="text-xs font-bold font-space text-white uppercase tracking-widest mb-6">User Discovery Matrix</h4>
                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-8">
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search name or email..."
                      className="flex-1 bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:border-cyan-500"
                    />
                    <button 
                      onClick={handleSearchUsers}
                      className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-2xl font-bold uppercase text-[10px] tracking-widest"
                    >
                      Search
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                     {discoveredUsers.map(user => (
                       <div key={user.id} className="flex justify-between items-center p-4 rounded-2xl bg-black/40 border border-white/5">
                          <div className="flex items-center gap-4">
                             <img src={user.avatar} className="w-10 h-10 rounded-xl border border-white/10" alt="" />
                             <p className="text-xs font-bold text-white uppercase">{user.name}</p>
                          </div>
                          <button 
                            onClick={() => handleInviteUser(user.id)}
                            className="px-4 py-2 bg-white/5 hover:bg-cyan-500/20 text-[9px] font-bold text-cyan-400 border border-cyan-500/20 rounded-xl uppercase transition-all"
                          >
                            Sync User
                          </button>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
           <div className="glass w-full max-w-md p-10 rounded-[40px] border border-cyan-500/30 animate-in zoom-in-95">
              <h3 className="text-2xl font-bold font-space mb-2 text-white uppercase tracking-tighter">Initialize Cluster</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-10">Assign a designation to the study group</p>
              
              <input 
                type="text" 
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="Cluster Designation (e.g. Clinical Core 4)"
                className="w-full bg-slate-900 border border-white/10 rounded-2xl px-8 py-5 text-white focus:border-cyan-500 outline-none text-sm mb-10"
              />
              
              <div className="flex gap-4">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Abort</button>
                <button 
                  onClick={handleCreateGroup}
                  disabled={isCreating || !newGroupName.trim()}
                  className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl shadow-cyan-600/20"
                >
                  {isCreating ? 'Synchronizing...' : 'Initialize'}
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default GroupHub;
