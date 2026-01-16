import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, UserPlus, Loader2, Sparkles } from 'lucide-react';
import GroupCard from '@/components/groups/GroupCard';
import CreateGroupModal from '@/components/modals/CreateGroupModal';
import JoinGroupModal from '@/components/modals/JoinGroupModal';
import SetDisplayNameModal from '@/components/modals/SetDisplayNameModal';
import { toast } from 'sonner';

export default function Home() {
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false);
  const [joinError, setJoinError] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then((userData) => {
      setUser(userData);
      if (!userData.display_name) {
        setShowDisplayNameModal(true);
      }
    });
  }, []);

  const { data: allGroups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => base44.entities.Group.list(),
    enabled: !!user
  });

  // Filter groups where user is owner or member
  const myGroups = allGroups.filter(group => 
    group.owner_email === user?.email || 
    group.members?.some(m => m.email === user?.email)
  );

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      return base44.entities.Group.create({
        ...data,
        invite_code: inviteCode,
        owner_email: user.email,
        members: [{
          email: user.email,
          name: user.display_name || user.full_name || user.email,
          joined_at: new Date().toISOString()
        }]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      setShowCreateModal(false);
    }
  });

  const joinMutation = useMutation({
    mutationFn: async (code) => {
      const groups = await base44.entities.Group.filter({ invite_code: code });
      if (groups.length === 0) {
        throw new Error('Código de convite inválido');
      }
      const group = groups[0];
      
      // Check if already a member
      if (group.members?.some(m => m.email === user.email)) {
        throw new Error('Você já é membro deste grupo');
      }
      
      // Add user to group
      const updatedMembers = [
        ...(group.members || []),
        {
          email: user.email,
          name: user.display_name || user.full_name || user.email,
          joined_at: new Date().toISOString()
        }
      ];
      
      return base44.entities.Group.update(group.id, { members: updatedMembers });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      setShowJoinModal(false);
      setJoinError('');
    },
    onError: (err) => {
      setJoinError(err.message);
    }
  });

  const saveDisplayNameMutation = useMutation({
    mutationFn: async (displayName) => {
      await base44.auth.updateMe({ display_name: displayName });
      return displayName;
    },
    onSuccess: (displayName) => {
      setUser({ ...user, display_name: displayName });
      setShowDisplayNameModal(false);
      toast.success('Nome atualizado!');
    }
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25 mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Pedidos de Cartas MTG
          </h1>
          <p className="text-slate-500">
            Coordene compras de cartas com seus amigos
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/25"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Grupo
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowJoinModal(true)}
            className="border-violet-200 hover:bg-violet-50"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Entrar em Grupo
          </Button>
        </div>

        {/* Groups List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          </div>
        ) : myGroups.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 mb-4">
              <Sparkles className="h-10 w-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">
              Nenhum grupo ainda
            </h2>
            <p className="text-slate-500 mb-6">
              Crie um novo grupo ou entre em um existente
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">
              Seus Grupos
            </h2>
            {myGroups.map((group) => (
              <GroupCard 
                key={group.id} 
                group={group} 
                isOwner={group.owner_email === user.email}
              />
            ))}
          </div>
        )}
      </div>

      <CreateGroupModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createMutation.mutate}
        isLoading={createMutation.isPending}
      />

      <JoinGroupModal
        open={showJoinModal}
        onClose={() => {
          setShowJoinModal(false);
          setJoinError('');
        }}
        onJoin={joinMutation.mutate}
        isLoading={joinMutation.isPending}
        error={joinError}
      />

      <SetDisplayNameModal
        open={showDisplayNameModal}
        onClose={() => setShowDisplayNameModal(false)}
        onSave={saveDisplayNameMutation.mutate}
        isLoading={saveDisplayNameMutation.isPending}
        currentName={user?.display_name || user?.full_name || ''}
      />
    </div>
  );
}