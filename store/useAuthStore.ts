import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: any | null;
  escolaId: number | null;
  isInitialized: boolean;
  loadUserProfile: () => Promise<void>;
  clearSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  escolaId: null,
  isInitialized: false,

  loadUserProfile: async () => {
    try {
      // 1. getSession() é instantâneo pois lê da memória cache do celular
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        set({ user: null, escolaId: null, isInitialized: true });
        return;
      }

      const currentUser = session.user;

      // 2. O SEGREDO: Usar maybeSingle() em vez de single()
      // Assim, se o professor não existir na tabela ou a internet piscar, ele não dá erro fatal!
      const { data: prof, error: profError } = await supabase
        .from('tb_professor')
        .select('id_escola')
        .eq('auth_id', currentUser.id)
        .maybeSingle(); 

      if (profError) {
        console.warn("Aviso ao buscar ID da escola:", profError.message);
      }

      // 3. Salva na memória e libera o app!
      set({ 
        user: currentUser, 
        escolaId: prof?.id_escola || null,
        isInitialized: true
      });

    } catch (error) {
      console.error("Erro fatal ao carregar perfil global:", error);
      // Se der um erro muito bizarro, zera a sessão por segurança
      set({ user: null, escolaId: null, isInitialized: true }); 
    }
  },

  clearSession: async () => {
    await supabase.auth.signOut();
    set({ user: null, escolaId: null });
  }
}));