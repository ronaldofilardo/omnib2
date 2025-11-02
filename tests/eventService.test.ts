const assert = require('assert');

describe('eventService', () => {
    it('deve retornar todos os eventos', () => {
        // Teste para verificar se todos os eventos são retornados corretamente
        const eventos = eventService.getAllEvents();
        assert(Array.isArray(eventos));
    });

    it('deve adicionar um novo evento', () => {
        // Teste para verificar se um novo evento é adicionado corretamente
        const novoEvento = { id: 1, nome: 'Evento Teste' };
        eventService.addEvent(novoEvento);
        const eventos = eventService.getAllEvents();
        assert(eventos.includes(novoEvento));
    });

    it('deve atualizar um evento existente', () => {
        // Teste para verificar se um evento existente é atualizado corretamente
        const eventoAtualizado = { id: 1, nome: 'Evento Atualizado' };
        eventService.updateEvent(eventoAtualizado);
        const evento = eventService.getEventById(1);
        assert.strictEqual(evento.nome, 'Evento Atualizado');
    });

    it('deve remover um evento', () => {
        // Teste para verificar se um evento é removido corretamente
        eventService.removeEvent(1);
        const evento = eventService.getEventById(1);
        assert.strictEqual(evento, undefined);
    });
});