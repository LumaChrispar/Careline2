import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import useAuthStore from '../stores/authStore'
import useUiStore from '../stores/uiStore'
import { Megaphone, Send, Clock, User, Trash2, Users, UserRound, Globe } from 'lucide-react'

export default function StaffCommunicationPage() {
  const { user, role } = useAuthStore()
  const { addToast } = useUiStore()
  const [messages, setMessages] = useState([])
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState('normal')
  const [targetType, setTargetType] = useState('all')
  const [targetRole, setTargetRole] = useState('doctor')
  const [targetUserId, setTargetUserId] = useState('')
  const [staff, setStaff] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('staff_broadcasts')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setMessages(data)
  }

  const fetchStaff = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, role')
      .neq('role', 'patient')
      .order('name')
    if (!error && data) setStaff(data)
  }

  useEffect(() => {
    fetchMessages()
    fetchStaff()
  }, [])

  const handlePost = async (e) => {
    e.preventDefault()
    if (!content.trim()) return
    if (targetType === 'individual' && !targetUserId) {
      addToast('Please select a staff member', 'error')
      return
    }

    setIsLoading(true)
    const { error } = await supabase.from('staff_broadcasts').insert([{
      author_id: user.id,
      author_name: user.name || 'Staff Member',
      content: content.trim(),
      priority,
      target_type: targetType,
      target_role: targetType === 'role' ? targetRole : null,
      target_user_id: targetType === 'individual' ? targetUserId : null,
      facility_id: user.user_metadata?.facility_id || null
    }])

    if (!error) {
      setContent('')
      setTargetType('all')
      setTargetUserId('')
      addToast('Broadcast posted successfully', 'success')
      fetchMessages()
    } else {
      addToast('Failed to post: ' + error.message, 'error')
    }
    setIsLoading(false)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('staff_broadcasts').delete().eq('id', id)
    if (!error) {
      addToast('Message removed', 'success')
      fetchMessages()
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 glass-card rounded-xl bg-primary/10">
          <Megaphone className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight">Staff Notice Board</h1>
          <p className="text-sm text-text-muted font-medium">Broadcast updates to specific roles or individual team members</p>
        </div>
      </div>

      {/* Post Message */}
      <div className="glass-card p-8 border-white/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-50 group-focus-within:opacity-100 transition-opacity" />
        <form onSubmit={handlePost} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Broadcast Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What do you want to share with the team?"
              rows={3}
              className="w-full bg-white/[0.03] border-white/5 rounded-2xl p-4 focus:border-primary/30 transition-all outline-none resize-none text-sm font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Target Audience</label>
              <div className="flex gap-2 p-1 bg-white/[0.03] rounded-xl border border-white/5">
                {[
                  { id: 'all', icon: Globe, label: 'All' },
                  { id: 'role', icon: Users, label: 'Role' },
                  { id: 'individual', icon: UserRound, label: 'One' }
                ].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setTargetType(type.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      targetType === type.id 
                        ? 'bg-primary text-black shadow-lg shadow-primary/20' 
                        : 'text-text-muted hover:bg-white/5'
                    }`}
                  >
                    <type.icon size={12} /> {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {targetType === 'role' && (
                <>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Select Role</label>
                  <select 
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full bg-white/[0.03] border-white/5 rounded-xl px-4 py-2 text-xs font-bold"
                  >
                    <option value="doctor">Doctors</option>
                    <option value="labtech">Lab Technicians</option>
                    <option value="nurse">Nurses</option>
                    <option value="admin">Administrators</option>
                  </select>
                </>
              )}
              {targetType === 'individual' && (
                <>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Select Staff Member</label>
                  <select 
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full bg-white/[0.03] border-white/5 rounded-xl px-4 py-2 text-xs font-bold"
                  >
                    <option value="">-- Pick a person --</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </>
              )}
              {targetType === 'all' && (
                 <div className="h-full flex items-center pt-6 opacity-30 italic text-[10px] text-text-muted font-bold uppercase tracking-widest">
                    Visible to everyone on the roster
                 </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div className="flex items-center gap-4">
               {['normal', 'urgent'].map(p => (
                 <label key={p} className="flex items-center gap-2 cursor-pointer group">
                   <input 
                    type="radio" 
                    name="priority" 
                    value={p} 
                    checked={priority === p} 
                    onChange={(e) => setPriority(e.target.value)}
                    className="hidden"
                   />
                   <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                     priority === p 
                      ? (p === 'urgent' ? 'border-danger' : 'border-primary') 
                      : 'border-white/10 group-hover:border-white/30'
                   }`}>
                     {priority === p && <div className={`w-2 h-2 rounded-full ${p === 'urgent' ? 'bg-danger' : 'bg-primary'}`} />}
                   </div>
                   <span className={`text-[10px] font-black uppercase tracking-widest ${priority === p ? 'text-text' : 'text-text-muted'}`}>
                     {p}
                   </span>
                 </label>
               ))}
            </div>
            <button 
              type="submit" 
              disabled={isLoading || !content.trim()} 
              className={`btn ${priority === 'urgent' ? 'btn-danger px-10' : 'btn-primary px-10'} rounded-2xl shadow-xl transition-all`}
            >
              {isLoading ? 'Posting...' : 'Post Broadcast'}
              {!isLoading && <Send className="w-4 h-4 ml-2" />}
            </button>
          </div>
        </form>
      </div>

      {/* Message List */}
      <div className="space-y-6">
        {messages.length === 0 ? (
          <div className="glass-card p-20 text-center flex flex-col items-center gap-6 opacity-40 border-dashed border-white/10 bg-transparent">
            <Megaphone size={48} className="text-text-muted" />
            <p className="text-sm font-black uppercase tracking-widest text-text-muted">The board is currently empty</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`glass-card p-8 group transition-all hover:border-white/20 relative ${msg.priority === 'urgent' ? 'border-l-4 border-l-danger bg-danger/[0.02]' : 'border-white/5'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-lg ${
                    msg.priority === 'urgent' ? 'bg-danger/20 text-danger' : 'bg-primary/20 text-primary'
                  }`}>
                    {msg.author_name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-black text-base">{msg.author_name}</h3>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                        msg.target_type === 'all' 
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                          : msg.target_type === 'role'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : 'bg-accent/10 text-accent border-accent/20'
                      }`}>
                        {msg.target_type === 'all' ? 'All Staff' : msg.target_type === 'role' ? `${msg.target_role}s` : 'Private'}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                      <Clock className="w-3 h-3 opacity-50" />
                      {new Date(msg.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {(msg.author_id === user?.id || role === 'admin') && (
                  <button 
                    onClick={() => handleDelete(msg.id)}
                    className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-text-muted opacity-0 group-hover:opacity-100 hover:text-danger hover:bg-danger/10 hover:border-danger/20 transition-all duration-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[15px] leading-relaxed font-medium" style={{ color: 'var(--color-text)' }}>
                {msg.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
