import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// Definimos o que a nossa memória vai guardar
interface AuthState {
  user: any | null;           // Dados de autenticação (email, id)
  escolaId: number | null;    // O ID da escola do professor (O mais importante!)
  isInitialized: boolean;     // Para sabermos se o app já terminou de checar o login inicial
  loadUserProfile: () => Promise<void>; // Função para buscar os dados 1 única vez
  clearSession: () => Promise<void>;    // Função para limpar tudo ao sair
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  escolaId: null,
  isInitialized: false,

  loadUserProfile: async () => {
    try {
      // 1. Pega o usuário logado no Auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        set({ user: null, escolaId: null, isInitialized: true });
        return;
      }

      // 2. Pega o ID da escola desse usuário na tabela de professores
      const { data: prof } = await supabase
        .from('tb_professor')
        .select('id_escola')
        .eq('auth_id', user.id)
        .single();

      // 3. Salva tudo na memória global!
      set({ 
        user: user, 
        escolaId: prof?.id_escola || null,
        isInitialized: true
      });

    } catch (error) {
      console.error("Erro ao carregar perfil global:", error);
      set({ user: null, escolaId: null, isInitialized: true });
    }
  },

  clearSession: async () => {
    await supabase.auth.signOut();
    set({ user: null, escolaId: null });
  }
}));