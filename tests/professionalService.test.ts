const assert = require('assert');

describe('Professional Service Tests', () => {
    it('should return a list of professionals', () => {
        const result = professionalService.getProfessionals();
        assert(Array.isArray(result));
    });

    it('should add a new professional', () => {
        const newProfessional = { name: 'John Doe', specialty: 'Developer' };
        const result = professionalService.addProfessional(newProfessional);
        assert.strictEqual(result.name, newProfessional.name);
    });

    it('should update a professional', () => {
        const updatedProfessional = { id: 1, name: 'Jane Doe', specialty: 'Designer' };
        const result = professionalService.updateProfessional(updatedProfessional);
        assert.strictEqual(result.id, updatedProfessional.id);
        assert.strictEqual(result.name, updatedProfessional.name);
    });

    it('should delete a professional', () => {
        const result = professionalService.deleteProfessional(1);
        assert.strictEqual(result, true);
    });
});