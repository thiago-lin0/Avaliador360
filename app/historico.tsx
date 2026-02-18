import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../lib/supabase';

// Interface atualizada para incluir os dados do aluno
interface Correcao {
  id_folha: any;
  nota_final: number | null;
  data_correcao: string | null;
  status: string | null;
  tb_aluno: {
    nome_completo: string;
  } | null;
}

export default function HistoricoScreen() {
  const router = useRouter();
  const [correcoes, setCorrecoes] = useState<Correcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const buscarHistorico = async () => {
    try {
      setLoading(true);
      
      // 🎯 JOIN REALIZADO: Buscamos os dados da folha + o nome do aluno na tabela vinculada
      const { data, error } = await supabase
        .from('tb_folha_resposta')
        .select(`
          id_folha,
          nota_final,
          data_correcao,
          status,
          tb_aluno (
            nome_completo
          )
        `)
        .eq('status', 'CORRIGIDA')
        .order('data_correcao', { ascending: false })
        .limit(15); 

      if (error) throw error;

      if (data) {
        // Tratamento para garantir que tb_aluno seja lido corretamente (caso venha como array)
        const formatados = data.map(item => ({
          ...item,
          tb_aluno: Array.isArray(item.tb_aluno) ? item.tb_aluno[0] : item.tb_aluno
        }));
        setCorrecoes(formatados);
      }

    } catch (error: any) {
      console.error('Erro ao buscar histórico:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    buscarHistorico();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    buscarHistorico();
  };

  const renderItem = ({ item }: { item: Correcao }) => {
    // 🎯 EXIBIÇÃO: Prioriza o nome do aluno, se não houver, usa o ID
    const nomeExibicao = item.tb_aluno?.nome_completo || `ID: ${String(item.id_folha).substring(0, 8)}...`;

    let dataTexto = "--/--/--";
    let horaTexto = "--:--";
    
    if (item.data_correcao) {
      const dataObj = new Date(item.data_correcao);
      dataTexto = dataObj.toLocaleDateString('pt-BR');
      horaTexto = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    const notaExibida = (item.nota_final !== null && item.nota_final !== undefined) 
      ? item.nota_final.toFixed(1) 
      : "0.0";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="person" size={24} color="#2B428C" />
          </View>
          
          <View style={styles.infoContainer}>
            <Text style={styles.nomeText} numberOfLines={1}>{nomeExibicao}</Text>
            <Text style={styles.dateText}>{dataTexto} às {horaTexto}</Text>
          </View>

          <View style={styles.notaContainer}>
            <Text style={styles.notaLabel}>NOTA</Text>
            <Text style={[styles.notaValue, { color: (item.nota_final || 0) >= 6 ? '#15803D' : '#C62828' }]}>
              {notaExibida}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
          <Ionicons name="arrow-back" size={26} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
            <Text style={styles.title}>Histórico</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>CORRIGIDAS</Text></View>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.btnBack}>
          <Ionicons name="refresh" size={22} color="#2B428C" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2B428C" />
        </View>
      ) : (
        <FlatList
          data={correcoes}
          keyExtractor={(item, index) => String(item.id_folha || index)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2B428C" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={80} color="#CBD5E1" />
              <Text style={styles.emptyText}>Nenhuma prova encontrada</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  headerTitleBox: { alignItems: 'center' },
  badge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, borderRadius: 5, marginTop: 2 },
  badgeText: { color: '#2E7D32', fontSize: 10, fontWeight: 'bold' },
  btnBack: { padding: 5 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  list: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2, 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 5, 
    shadowOffset: { width: 0, height: 2 } 
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { 
    width: 50, 
    height: 50, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F1F5F9'
  },
  infoContainer: { flex: 1, marginLeft: 15 },
  nomeText: { fontSize: 16, fontWeight: '700', color: '#334155' },
  dateText: { fontSize: 12, color: '#94A3B8', marginTop: 3 },
  notaContainer: { alignItems: 'center', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 12, minWidth: 65 },
  notaLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '800', marginBottom: 2 },
  notaValue: { fontSize: 18, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText: { marginTop: 15, color: '#475569', fontSize: 18, fontWeight: 'bold' },
}); 