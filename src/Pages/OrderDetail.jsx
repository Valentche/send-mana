import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, Plus, Search, MessageSquare, Package, 
  Loader2, Calendar, DollarSign, Trash2, User, Clock, X
} from 'lucide-react';
import { toast } from 'sonner';
import { format, isPast } from 'date-fns';
import CardSearchModal from '@/components/cards/CardSearchModal';
import GroupChat from '@/components/chat/GroupChat';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const statusConfig = {
  open: { label: 'Aberto', className: 'bg-emerald-100 text-emerald-700' },
  closed: { label: 'Fechado', className: 'bg-amber-100 text-amber-700' },
  ordered: { label: 'Encomendado', className: 'bg-blue-100 text-blue-700' },
  delivered: { label: 'Entregue', className: 'bg-slate-100 text-slate-600' },
  cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-700' }
};

export default function OrderDetail() {
  const [user, setUser] = useState(null);
  const [showCardSearch, setShowCardSearch] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);
  const [totalValue, setTotalValue] = useState('');
  const queryClient = useQueryClient();
  
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: order, isLoading: loadingOrder } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const orders = await base44.entities.Order.filter({ id: orderId });
      return orders[0];
    },
    enabled: !!orderId
  });

  const { data: group } = useQuery({
    queryKey: ['group', order?.group_id],
    queryFn: async () => {
      const groups = await base44.entities.Group.filter({ id: order.group_id });
      return groups[0];
    },
    enabled: !!order?.group_id
  });

  const { data: cards = [], isLoading: loadingCards } = useQuery({
    queryKey: ['orderCards', orderId],
    queryFn: () => base44.entities.OrderCard.filter({ order_id: orderId }, '-created_date'),
    enabled: !!orderId
  });

  const addCardMutation = useMutation({
    mutationFn: (cardData) => base44.entities.OrderCard.create({
      ...cardData,
      order_id: orderId,
      group_id: order.group_id,
      added_by_email: user.email,
      added_by_name: user.display_name || user.full_name || user.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['orderCards', orderId]);
      toast.success('Carta adicionada!');
    }
  });

  const deleteCardMutation = useMutation({
    mutationFn: (cardId) => base44.entities.OrderCard.delete(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries(['orderCards', orderId]);
      setCardToDelete(null);
      toast.success('Carta removida');
    }
  });

  const updateOrderMutation = useMutation({
    mutationFn: (data) => base44.entities.Order.update(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['order', orderId]);
      toast.success('Pedido atualizado');
    }
  });

  useEffect(() => {
    if (order?.total_value) {
      setTotalValue(order.total_value.toString());
    }
  }, [order]);

  if (!user || loadingOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Pedido não encontrado</p>
      </div>
    );
  }

  const isExpired = isPast(new Date(order.deadline)) && order.status === 'open';
  const canAddCards = order.status === 'open' && !isExpired;
  const isOwner = group?.owner_email === user.email;
  const status = statusConfig[order.status];

  // Group cards by user
  const cardsByUser = cards.reduce((acc, card) => {
    const key = card.added_by_email;
    if (!acc[key]) {
      acc[key] = { name: card.added_by_name, cards: [], total: 0 };
    }
    acc[key].cards.push(card);
    acc[key].total += (card.price || 0) * (card.quantity || 1);
    return acc;
  }, {});

  const grandTotal = cards.reduce((sum, c) => sum + (c.price || 0) * (c.quantity || 1), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl(`GroupDetail?id=${order.group_id}`)}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-800">{order.title}</h1>
              <Badge className={status.className}>{status.label}</Badge>
            </div>
            <p className="text-slate-500 text-sm">{group?.name}</p>
          </div>
        </div>

        {/* Order Info */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100">
                <Calendar className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Prazo Final</p>
                <p className={`font-semibold ${isExpired ? 'text-red-500' : ''}`}>
                  {format(new Date(order.deadline), 'MMM d, yyyy')}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Package className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total de Cartas</p>
                <p className="font-semibold">{cards.reduce((s, c) => s + (c.quantity || 1), 0)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Est.</p>
                <p className="font-semibold">${grandTotal.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Control (for owner) */}
        {isOwner && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Status:</span>
                  <Select 
                    value={order.status} 
                    onValueChange={(v) => updateOrderMutation.mutate({ status: v })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aberto</SelectItem>
                      <SelectItem value="closed">Fechado</SelectItem>
                      <SelectItem value="ordered">Encomendado</SelectItem>
                      <SelectItem value="delivered">Entregue</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Total Final:</span>
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={totalValue}
                    onChange={(e) => setTotalValue(e.target.value)}
                    className="w-28"
                  />
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => updateOrderMutation.mutate({ total_value: parseFloat(totalValue) || 0 })}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
              {order.notes && (
                <p className="text-sm text-slate-500 mt-3 p-2 bg-slate-50 rounded">
                  {order.notes}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="cards">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="cards" className="gap-2">
              <Package className="h-4 w-4" />
              Cartas
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cards">
            {canAddCards && (
              <div className="flex justify-end mb-4">
                <Button 
                  onClick={() => setShowCardSearch(true)}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Cartas
                </Button>
              </div>
            )}

            {loadingCards ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-10">
                <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nenhuma carta adicionada ainda</p>
                {canAddCards && (
                  <p className="text-sm text-slate-400">Clique em "Adicionar Cartas" para buscar e adicionar</p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(cardsByUser).map(([email, data]) => (
                  <div key={email}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-violet-600" />
                        <span className="font-medium text-slate-700">{data.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          ${data.total.toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {data.cards.map((card) => (
                        <Card key={card.id} className="overflow-hidden group relative">
                          {card.card_image ? (
                            <img 
                              src={card.card_image} 
                              alt={card.card_name}
                              className="w-full"
                            />
                          ) : (
                            <div className="aspect-[2.5/3.5] bg-slate-100 flex items-center justify-center p-2">
                              <span className="text-xs text-center text-slate-500">{card.card_name}</span>
                            </div>
                          )}
                          <div className="p-2 text-center">
                            <p className="text-xs font-medium truncate">{card.card_name}</p>
                            {card.quantity > 1 && (
                              <Badge className="mt-1 text-xs">x{card.quantity}</Badge>
                            )}
                            {card.price > 0 && (
                              <p className="text-xs text-emerald-600 mt-1">${(card.price * card.quantity).toFixed(2)}</p>
                            )}
                          </div>
                          {(card.added_by_email === user.email && canAddCards) && (
                            <button
                              onClick={() => setCardToDelete(card)}
                              className="absolute top-1 right-1 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="chat">
            <Card className="h-[500px]">
              <GroupChat groupId={order.group_id} orderId={orderId} currentUser={user} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CardSearchModal
        open={showCardSearch}
        onClose={() => setShowCardSearch(false)}
        onAddCard={addCardMutation.mutate}
      />

      <AlertDialog open={!!cardToDelete} onOpenChange={() => setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Carta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {cardToDelete?.card_name} deste pedido?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteCardMutation.mutate(cardToDelete.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}