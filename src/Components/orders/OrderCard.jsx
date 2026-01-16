import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Package, ChevronRight, Clock, Trash2 } from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';

const statusConfig = {
  open: { label: 'Aberto', className: 'bg-emerald-100 text-emerald-700' },
  closed: { label: 'Fechado', className: 'bg-amber-100 text-amber-700' },
  ordered: { label: 'Encomendado', className: 'bg-blue-100 text-blue-700' },
  delivered: { label: 'Entregue', className: 'bg-slate-100 text-slate-600' },
  cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-700' }
};

export default function OrderCard({ order, cardCount = 0, isOwner = false, onDelete }) {
  const deadline = new Date(order.deadline);
  const isExpired = isPast(deadline) && order.status === 'open';
  const daysLeft = differenceInDays(deadline, new Date());
  const status = statusConfig[order.status] || statusConfig.open;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-slate-200 hover:border-violet-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
            <Link to={createPageUrl(`OrderDetail?id=${order.id}`)} className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg text-slate-800 group-hover:text-violet-700 transition-colors">
                  {order.title}
                </h3>
                <Badge className={status.className}>
                  {status.label}
                </Badge>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Calendar className="h-4 w-4" />
                  <span>{format(deadline, 'MMM d, yyyy')}</span>
                </div>
                
                {order.status === 'open' && (
                  <div className={`flex items-center gap-1.5 ${isExpired ? 'text-red-500' : daysLeft <= 2 ? 'text-amber-500' : 'text-slate-500'}`}>
                    <Clock className="h-4 w-4" />
                    <span>
                      {isExpired 
                        ? 'Expirado' 
                        : daysLeft === 0 
                          ? 'Último dia!' 
                          : `${daysLeft} dias restantes`}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Package className="h-4 w-4" />
                  <span>{cardCount} cartas</span>
                </div>
              </div>
              
              {order.total_value > 0 && (
                <p className="mt-2 text-sm font-medium text-emerald-600">
                  Total: ${order.total_value.toFixed(2)} {order.currency}
                </p>
              )}
            </Link>
            <div className="flex items-center gap-2">
              <Link to={createPageUrl(`OrderDetail?id=${order.id}`)}>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-violet-500 transition-colors" />
              </Link>
              {isOwner && onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(order);
                  }}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
  );
}