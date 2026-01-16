import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Loader2, X } from 'lucide-react';
import { debounce } from 'lodash';

export default function CardSearchModal({ open, onClose, onAddCard }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const searchCards = useCallback(
    debounce(async (searchQuery) => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(
          `https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchQuery)}&unique=prints`
        );
        if (response.ok) {
          const data = await response.json();
          setResults(data.data?.slice(0, 20) || []);
        } else {
          setResults([]);
        }
      } catch (err) {
        setResults([]);
      }
      setLoading(false);
    }, 400),
    []
  );

  const handleSearch = (value) => {
    setQuery(value);
    searchCards(value);
  };

  const handleSelectCard = (card) => {
    setSelectedCard(card);
    setQuantity(1);
  };

  const handleAddCard = () => {
    if (selectedCard) {
      const imageUri = selectedCard.image_uris?.normal || 
                       selectedCard.card_faces?.[0]?.image_uris?.normal ||
                       '';
      onAddCard({
        scryfall_id: selectedCard.id,
        card_name: selectedCard.name,
        card_image: imageUri,
        set_name: selectedCard.set_name,
        price: selectedCard.prices?.usd ? parseFloat(selectedCard.prices.usd) : 0,
        quantity: quantity
      });
      setSelectedCard(null);
      setQuery('');
      setResults([]);
      onClose();
    }
  };

  const getCardImage = (card) => {
    return card.image_uris?.small || 
           card.card_faces?.[0]?.image_uris?.small ||
           '';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">Buscar Cartas</DialogTitle>
        </DialogHeader>
        
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar uma carta..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 h-11"
              autoFocus
            />
          </div>
        </div>

        {selectedCard ? (
          <div className="p-6 flex flex-col items-center gap-4">
            <img 
              src={selectedCard.image_uris?.normal || selectedCard.card_faces?.[0]?.image_uris?.normal}
              alt={selectedCard.name}
              className="w-64 rounded-xl shadow-lg"
            />
            <div className="text-center">
              <h3 className="font-semibold text-lg">{selectedCard.name}</h3>
              <p className="text-sm text-slate-500">{selectedCard.set_name}</p>
              {selectedCard.prices?.usd && (
                <p className="text-sm font-medium text-emerald-600 mt-1">
                  ${selectedCard.prices.usd}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Quantidade:</span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </Button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </Button>
              </div>
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" onClick={() => setSelectedCard(null)}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleAddCard} className="bg-violet-600 hover:bg-violet-700">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar ao Pedido
              </Button>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
              </div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
                {results.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => handleSelectCard(card)}
                    className="group relative rounded-lg overflow-hidden transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {getCardImage(card) ? (
                      <img 
                        src={getCardImage(card)} 
                        alt={card.name}
                        className="w-full rounded-lg"
                      />
                    ) : (
                      <div className="aspect-[2.5/3.5] bg-slate-100 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-slate-500 p-2 text-center">{card.name}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : query.length >= 2 ? (
              <div className="flex items-center justify-center h-32 text-slate-500">
                Nenhuma carta encontrada
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-slate-400">
                Comece a digitar para buscar...
              </div>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}