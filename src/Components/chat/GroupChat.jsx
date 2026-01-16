import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function GroupChat({ groupId, orderId, currentUser }) {
  const [message, setMessage] = useState('');
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat', groupId, orderId],
    queryFn: () => {
      const filter = orderId 
        ? { group_id: groupId, order_id: orderId }
        : { group_id: groupId };
      return base44.entities.ChatMessage.filter(filter, '-created_date', 100);
    },
    refetchInterval: 5000
  });

  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['chat', groupId, orderId]);
      setMessage('');
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate({
      group_id: groupId,
      order_id: orderId || null,
      sender_email: currentUser.email,
      sender_name: currentUser.display_name || currentUser.full_name || currentUser.email,
      message: message.trim()
    });
  };

  const sortedMessages = [...messages].reverse();

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
            Nenhuma mensagem ainda. Inicie a conversa!
          </div>
        ) : (
          <div className="space-y-3">
            {sortedMessages.map((msg) => {
              const isOwn = msg.sender_email === currentUser.email;
              return (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                >
                  <div>
                    {!isOwn && (
                      <p className="text-xs font-semibold text-violet-700 mb-1 px-2">
                        {msg.sender_name}
                      </p>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      isOwn 
                        ? 'bg-violet-600 text-white' 
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 mt-1 px-2">
                    {format(new Date(msg.created_date), 'HH:mm')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
      
      <div className="p-4 border-t border-slate-100">
        <div className="flex gap-2">
          <Input
            placeholder="Digite uma mensagem..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={!message.trim() || sendMutation.isPending}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}