import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ChevronRight, Crown } from 'lucide-react';

export default function GroupCard({ group, isOwner }) {
  return (
    <Link to={createPageUrl(`GroupDetail?id=${group.id}`)}>
      <Card className="group hover:shadow-lg transition-all duration-300 border-slate-200 hover:border-violet-300 cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg text-slate-800 group-hover:text-violet-700 transition-colors">
                  {group.name}
                </h3>
                {isOwner && (
                  <Crown className="h-4 w-4 text-amber-500" />
                )}
              </div>
              {group.description && (
                <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                  {group.description}
                </p>
              )}
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                  <Users className="h-3 w-3 mr-1" />
                  {group.members?.length || 1} membros
                </Badge>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-violet-500 transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}