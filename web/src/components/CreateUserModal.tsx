'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Eye, EyeOff } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

interface CreateUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Callback opcional após cadastro bem-sucedido
  onRegistered?: (user: { email: string; name?: string }) => void
}

export function CreateUserModal({ open, onOpenChange, onRegistered }: CreateUserModalProps) {
  const [fullName, setFullName] = useState('')
  const [cpf, setCpf] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmClose, setShowConfirmClose] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Resetar todos os campos ao fechar o modal
  useEffect(() => {
    if (!open) {
  setFullName('');
  setCpf('');
  setPhone('');
  setEmail('');
  setPassword('');
  setShowPassword(false);
  setShowConfirmClose(false);
  setSubmitting(false);
  setError(null);
    }
  }, [open]);

  // Format CPF: 000.000.000-00
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }
    return cpf
  }

  // Format Phone: (00) 00000-0000 ou (00) 0000-0000
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 10) {
      // Telefone fixo: (11) 8765-4321
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
    } else if (numbers.length === 11) {
      // Celular: (11) 98765-4321
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
    }
    return phone
  }

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value))
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value))
  }

  // Validar CPF: deve ter 11 dígitos
  const validateCPF = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, '')
    return numbers.length === 11
  }

  const handleSubmit = async () => {
    if (!email || !password || !cpf) {
      setError('E-mail, senha e CPF são obrigatórios')
      return
    }
    if (!validateCPF(cpf)) {
      setError('CPF deve ter 11 dígitos')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: fullName,
          cpf,
          telefone: phone
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao criar usuário')
      }
      // Sucesso: fechar modal e notificar parent
      onRegistered?.({ email, name: fullName })
      onOpenChange(false)
    } catch (e: any) {
      // Sempre mostrar mensagem amigável para erro de rede
      if (e?.message === 'Network error') {
        setError('Erro ao criar usuário')
      } else {
        setError(e?.message || 'Erro ao criar usuário')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setShowConfirmClose(true)
    } else {
      onOpenChange(newOpen)
    }
  }

  const confirmClose = () => {
    setShowConfirmClose(false)
    onOpenChange(false)
  }

  const cancelClose = () => {
    setShowConfirmClose(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[480px] p-8 bg-white rounded-lg">
          {/* Descrição oculta para acessibilidade */}
          <VisuallyHidden>
            <DialogDescription>Formulário para criação de novo usuário receptor com campos obrigatórios de CPF, email e senha</DialogDescription>
          </VisuallyHidden>
          <VisuallyHidden>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
          </VisuallyHidden>
          <DialogHeader>
            <DialogTitle className="text-center text-[#1F2937] mb-6">
              Criar Novo Usuário
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Nome completo */}
            <Input
              type="text"
              placeholder="Nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-12 bg-[#F3F4F6] border border-[#D1D5DB] rounded px-3 py-2 text-sm text-[#6B7280] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#9CA3AF]"
            />

            {/* CPF */}
            <Input
              type="text"
              placeholder="CPF *"
              value={cpf}
              onChange={handleCPFChange}
              maxLength={14}
              className="h-12 bg-[#F3F4F6] border border-[#D1D5DB] rounded px-3 py-2 text-sm text-[#6B7280] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#9CA3AF]"
            />

            {/* Telefone */}
            <Input
              type="text"
              placeholder="Telefone"
              value={phone}
              onChange={handlePhoneChange}
              maxLength={15}
              className="h-12 bg-[#F3F4F6] border border-[#D1D5DB] rounded px-3 py-2 text-sm text-[#6B7280] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#9CA3AF]"
            />

            {/* Email */}
            <Input
              type="email"
              placeholder="user@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-[#F3F4F6] border border-[#D1D5DB] rounded px-3 py-2 text-sm text-[#6B7280] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#9CA3AF]"
            />

            {/* Senha */}
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-[#F3F4F6] border border-[#D1D5DB] rounded px-3 py-2 pr-12 text-sm text-[#6B7280] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#9CA3AF]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Mensagem de erro */}
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            {/* Botão Criar Usuário */}
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-12 bg-[#10B981] hover:bg-[#059669] text-white rounded-md mt-2 shadow-sm disabled:opacity-60"
            >
              {submitting ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar saída</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Deseja realmente sair sem salvar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelClose}>
              Continuar editando
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose}>
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
