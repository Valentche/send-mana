import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Key } from 'lucide-react';

export default function JoinGroupModal({ open, onClose, onJoin, isLoading, error }) {
  const [code, setCode] = useState('');

  const handleSubmit = () => {
    if (!code.trim()) return;
    onJoin(code.trim().toUpperCase());
  };

  const handleClose = () => {
    setCode('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-violet-600" />
            Entrar em Grupo
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código de Convite</Label>
            <Input
              id="code"
              placeholder="Digite o código de convite do grupo"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="uppercase tracking-wider"
            />
            <p className="text-xs text-slate-500">
              Peça o código de convite ao criador do grupo
            </p>
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!code.trim() || isLoading}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Entrar no Grupo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}