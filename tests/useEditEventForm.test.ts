const assert = require('assert');

describe('useEditEventForm', () => {
    it('deve retornar o estado inicial corretamente', () => {
        const { result } = renderHook(() => useEditEventForm());
        expect(result.current.state).toEqual(initialState);
    });

    it('deve atualizar o estado ao chamar a função de edição', () => {
        const { result } = renderHook(() => useEditEventForm());
        act(() => {
            result.current.editEvent(newEvent);
        });
        expect(result.current.state).toEqual(updatedState);
    });

    it('deve lidar com erros corretamente', () => {
        const { result } = renderHook(() => useEditEventForm());
        act(() => {
            result.current.editEvent(invalidEvent);
        });
        expect(result.current.error).toBeDefined();
    });
});