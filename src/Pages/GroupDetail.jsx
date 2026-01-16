import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Plus, Users, Copy, Check, MessageSquare, 
  ShoppingCart, Loader2, Crown, Calendar, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import OrderCard from '@/components/orders/OrderCard';
import GroupChat from '@/components/chat/GroupChat';
import CreateOrderModal from '@/components/modals/CreateOrderModal';

export default function GroupDetail() {
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showDeleteGroup, setShowDeleteGroup] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const queryClient = useQueryClient();
  
  const urlParams = new URLSearchParams(window.location.search);
  const groupId = urlParams.get('id');

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: group, isLoading: loadingGroup } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const groups = await base44.entities.Group.filter({ id: groupId });
      return groups[0];
    },
    enabled: !!groupId
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['orders', groupId],
    queryFn: () => base44.entities.Order.filter({ group_id: groupId }, '-created_date'),
    enabled: !!groupId
  });

  const { data: allCards = [] } = useQuery({
    queryKey: ['cards', groupId],
    queryFn: () => base44.entities.OrderCard.filter({ group_id: groupId }),
    enabled: !!groupId
  });

  const createOrderMutation = useMutation({
    mutationFn: (data) => base44.entities.Order.create({
      ...data,
      group_id: groupId,
      status: 'open'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['orders', groupId]);
      setShowCreateOrder(false);
      toast.success('Pedido criado!');
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async () => {
      // Delete all cards in all orders
      const cardsToDelete = allCards.filter(c => c.group_id === groupId);
      await Promise.all(cardsToDelete.map(c => base44.entities.OrderCard.delete(c.id)));
      
      // Delete all orders
      await Promise.all(orders.map(o => base44.entities.Order.delete(o.id)));
      
      // Delete all chat messages
      const messages = await base44.entities.ChatMessage.filter({ group_id: groupId });
      await Promise.all(messages.map(m => base44.entities.ChatMessage.delete(m.id)));
      
      // Delete group
      await base44.entities.Group.delete(groupId);
    },
    onSuccess: () => {
      toast.success('Grupo deletado!');
      window.location.href = '/';
    }
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId) => {
      // Delete all cards in order
      const cardsToDelete = allCards.filter(c => c.order_id === orderId);
      await Promise.all(cardsToDelete.map(c => base44.entities.OrderCard.delete(c.id)));
      
      // Delete order
      await base44.entities.Order.delete(orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orders', groupId]);
      setOrderToDelete(null);
      toast.success('Pedido deletado!');
    }
  });

  const copyInviteCode = () => {
    navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getCardCount = (orderId) => {
    return allCards.filter(c => c.order_id === orderId).length;
  };

  if (!user || loadingGroup) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Grupo não encontrado</p>
      </div>
    );
  }

  const isOwner = group.owner_email === user.email;
  const openOrders = orders.filter(o => o.status === 'open');
  const closedOrders = orders.filter(o => o.status !== 'open');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">{group.name}</h1>
              {isOwner && <Crown className="h-5 w-5 text-amber-500" />}
            </div>
            {group.description && (
              <p className="text-slate-500 text-sm">{group.description}</p>
            )}
          </div>
          {isOwner && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowDeleteGroup(true)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-100">
                    <Users className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Membros</p>
                    <p className="font-semibold">{group.members?.length || 1}</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {group.members?.slice(0, 5).map((m, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {m.name?.split(' ')[0] || m.email.split('@')[0]}
                  </Badge>
                ))}
                {group.members?.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{group.members.length - 5}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100">
                    <Copy className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Código de Convite</p>
                    <p className="font-mono font-semibold tracking-wider">{group.invite_code}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={copyInviteCode}
                  className="text-violet-600"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orders" className="mt-6">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-700">Pedidos do Grupo</h2>
              <Button 
                onClick={() => setShowCreateOrder(true)}
                size="sm"
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Novo Pedido
              </Button>
            </div>

            {loadingOrders ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nenhum pedido ainda</p>
                <p className="text-sm text-slate-400">Crie seu primeiro pedido para começar a coletar cartas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {openOrders.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-emerald-600">Pedidos Abertos</h3>
                    {openOrders.map(order => (
                      <OrderCard 
                        key={order.id} 
                        order={order} 
                        cardCount={getCardCount(order.id)}
                        isOwner={isOwner}
                        onDelete={setOrderToDelete}
                      />
                    ))}
                  </div>
                )}
                {closedOrders.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <h3 className="text-sm font-medium text-slate-500">Pedidos Anteriores</h3>
                    {closedOrders.map(order => (
                      <OrderCard 
                        key={order.id} 
                        order={order} 
                        cardCount={getCardCount(order.id)}
                        isOwner={isOwner}
                        onDelete={setOrderToDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="chat">
            <Card className="h-[500px]">
              <GroupChat groupId={groupId} currentUser={user} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CreateOrderModal
        open={showCreateOrder}
        onClose={() => setShowCreateOrder(false)}
        onCreate={createOrderMutation.mutate}
        isLoading={createOrderMutation.isPending}
      />

      <AlertDialog open={showDeleteGroup} onOpenChange={setShowDeleteGroup}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Grupo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este grupo? Todos os pedidos, cartas e mensagens serão permanentemente removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteGroupMutation.mutate()}
              className="bg-red-500 hover:bg-red-600"
            >
              Deletar Grupo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Pedido</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o pedido "{orderToDelete?.title}"? Todas as cartas adicionadas serão removidas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteOrderMutation.mutate(orderToDelete.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              Deletar Pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}