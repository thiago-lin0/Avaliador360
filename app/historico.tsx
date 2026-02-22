import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';

// 1. Definição de Interfaces para o TypeScript
interface ProvaFiltro {
    id_prova: number;
    titulo: string;
}

interface Correcao {
    id_folha: any;
    nota_final: number | null;
    data_correcao: string | null;
    status: string | null;
    id_prova: number | null;
    tb_aluno: { nome_completo: string; } | null;
    tb_prova: { titulo: string; id_escola: number; } | null;
}

export default function HistoricoScreen() {
    const router = useRouter();
    const [correcoes, setCorrecoes] = useState<Correcao[]>([]);
    const [provasDisponiveis, setProvasDisponiveis] = useState<ProvaFiltro[]>([]);
    const [provaSelecionada, setProvaSelecionada] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // 2. Função principal para buscar dados da escola logada
    const carregarDados = async (idProva: number | null = null) => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            
            // Puxa o ID da escola dos metadados do professor logado
            const escolaId = Number(user?.user_metadata?.id_escola);

            if (!escolaId) {
                console.log("❌ Erro: Usuário sem ID de escola no perfil.");
                setLoading(false);
                return;
            }

            // A. Busca a lista de filtros (Chips) apenas daquela escola
            const { data: fData } = await supabase
                .from('tb_folha_resposta')
                .select(`id_prova, tb_prova!id_prova!inner ( titulo, id_escola )`)
                .eq('tb_prova.id_escola', escolaId)
                .eq('status', 'CORRIGIDA');

            if (fData) {
                const mapa = new Map();
                fData.forEach((item: any) => {
                    if (item.tb_prova) mapa.set(item.id_prova, item.tb_prova.titulo);
                });
                setProvasDisponiveis(Array.from(mapa.entries()).map(([id, t]) => ({ id_prova: id, titulo: t })));
            }

            // B. Busca o histórico de correções (Filtrado por Escola e opcionalmente por Prova)
            let query = supabase
                .from('tb_folha_resposta')
                .select(`
                    id_folha, nota_final, data_correcao, status,
                    tb_aluno!id_aluno ( nome_completo ),
                    tb_prova!id_prova!inner ( titulo, id_escola )
                `)
                .eq('tb_prova.id_escola', escolaId) // SEGURANÇA: Apenas dados da mesma unidade
                .eq('status', 'CORRIGIDA')
                .order('data_correcao', { ascending: false });

            if (idProva) query = query.eq('id_prova', idProva);

            const { data, error } = await query.limit(50);

            if (error) throw error;

            if (data) {
                const formatados = data.map(item => ({
                    ...item,
                    tb_aluno: Array.isArray(item.tb_aluno) ? item.tb_aluno[0] : item.tb_aluno,
                    tb_prova: Array.isArray(item.tb_prova) ? item.tb_prova[0] : item.tb_prova
                }));
                setCorrecoes(formatados as any);
            }
        } catch (error: any) {
            console.error('Erro ao buscar histórico:', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        carregarDados(provaSelecionada);
    };

    // 3. Renderização do Card de Aluno
    const renderItem = ({ item }: { item: Correcao }) => {
        const nome = item.tb_aluno?.nome_completo || "Aluno";
        const nota = item.nota_final || 0;
        const dataObj = item.data_correcao ? new Date(item.data_correcao) : null;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarTxt}>{nome.charAt(0)}</Text>
                    </View>
                    <View style={styles.content}>
                        <Text style={styles.nome} numberOfLines={1}>{nome}</Text>
                        <View style={styles.row}>
                            <Ionicons name="document-text-outline" size={12} color="#94A3B8" />
                            <Text style={styles.subText}> {item.tb_prova?.titulo} </Text>
                            <Text style={styles.separator}>•</Text>
                            <Text style={styles.subText}>{dataObj?.toLocaleDateString('pt-BR')}</Text>
                        </View>
                    </View>
                    <View style={[styles.badge, { backgroundColor: nota >= 6 ? '#DCFCE7' : '#FEE2E2' }]}>
                        <Text style={[styles.badgeTxt, { color: nota >= 6 ? '#166534' : '#991B1B' }]}>
                            {nota.toFixed(1)}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header com botão de voltar e refresh */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={26} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Histórico da Unidade</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.backBtn}>
                    <Ionicons name="sync" size={22} color="#2B428C" />
                </TouchableOpacity>
            </View>

            {/* Chips de Filtro por Prova */}
            <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    <TouchableOpacity 
                        style={[styles.chip, provaSelecionada === null && styles.chipActive]}
                        onPress={() => { setProvaSelecionada(null); carregarDados(null); }}
                    >
                        <Text style={[styles.chipText, provaSelecionada === null && styles.chipTextActive]}>Todas</Text>
                    </TouchableOpacity>
                    
                    {provasDisponiveis.map((p) => (
                        <TouchableOpacity 
                            key={p.id_prova} 
                            style={[styles.chip, provaSelecionada === p.id_prova && styles.chipActive]}
                            onPress={() => { setProvaSelecionada(p.id_prova); carregarDados(p.id_prova); }}
                        >
                            <Text style={[styles.chipText, provaSelecionada === p.id_prova && styles.chipTextActive]}>
                                {p.titulo}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Lista Principal */}
            {loading && !refreshing ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#2B428C" /></View>
            ) : (
                <FlatList
                    data={correcoes}
                    keyExtractor={(item) => String(item.id_folha)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="school-outline" size={60} color="#CBD5E1" />
                            <Text style={styles.emptyTxt}>Nenhuma correção encontrada para esta unidade.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

// 4. Estilos Unificados
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    backBtn: { padding: 8, backgroundColor: '#F8FAFC', borderRadius: 12 },
    filterContainer: { backgroundColor: '#FFF', paddingVertical: 12 },
    filterScroll: { paddingHorizontal: 16 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 10, borderWidth: 1, borderColor: '#E2E8F0' },
    chipActive: { backgroundColor: '#2B428C', borderColor: '#2B428C' },
    chipText: { fontSize: 13, color: '#64748B', fontWeight: '700' },
    chipTextActive: { color: '#FFF' },
    list: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { 
        backgroundColor: '#FFF', 
        borderRadius: 20, 
        padding: 16, 
        marginBottom: 12, 
        elevation: 2, 
        shadowColor: '#000', 
        shadowOpacity: 0.05, 
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 }
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center' },
    avatarTxt: { fontSize: 20, fontWeight: 'bold', color: '#4338CA' },
    content: { flex: 1, marginLeft: 14 },
    nome: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    row: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    subText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
    separator: { marginHorizontal: 5, color: '#CBD5E1', fontSize: 10 },
    badge: { minWidth: 50, padding: 8, borderRadius: 12, alignItems: 'center' },
    badgeTxt: { fontSize: 17, fontWeight: '900' },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyTxt: { marginTop: 15, color: '#94A3B8', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 }
});