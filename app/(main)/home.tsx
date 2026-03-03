import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

interface Minuta {
  id: string;
  casinoId: string;
  fecha: string;
  opcion1: string;
  opcion2: string;
  opcion3: string;
  opcion4: string | null;
  activo: boolean;
}

const DAYS_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const MONTHS_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const day = DAYS_ES[d.getDay()];
  const num = d.getDate();
  const month = MONTHS_ES[d.getMonth()];
  return { day, num, month };
}

function isToday(dateStr: string) {
  const today = new Date();
  const d = new Date(dateStr + "T12:00:00");
  return (
    today.getFullYear() === d.getFullYear() &&
    today.getMonth() === d.getMonth() &&
    today.getDate() === d.getDate()
  );
}

function MinutaCard({ item }: { item: Minuta }) {
  const dateInfo = formatDateLabel(item.fecha);
  const today = isToday(item.fecha);
  const optionCount = item.opcion4 ? 4 : 3;

  function handlePress() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: "/(main)/minuta-detail",
      params: { id: item.id, fecha: item.fecha },
    });
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.minutaCard,
        today && styles.minutaCardToday,
        pressed && styles.minutaCardPressed,
      ]}
      onPress={handlePress}
    >
      <View style={[styles.dateColumn, today && styles.dateColumnToday]}>
        <Text style={[styles.dayText, today && styles.dayTextToday]}>
          {dateInfo.day}
        </Text>
        <Text style={[styles.dateNum, today && styles.dateNumToday]}>
          {dateInfo.num}
        </Text>
        <Text style={[styles.monthText, today && styles.monthTextToday]}>
          {dateInfo.month}
        </Text>
      </View>
      <View style={styles.menuContent}>
        <View style={styles.menuHeader}>
          {today ? (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>HOY</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.optionsList}>
          <OptionPreview number={1} text={item.opcion1} />
          <OptionPreview number={2} text={item.opcion2} />
          <OptionPreview number={3} text={item.opcion3} />
          {item.opcion4 ? (
            <OptionPreview number={4} text={item.opcion4} />
          ) : null}
        </View>
        <View style={styles.menuFooter}>
          <Text style={styles.optionCountText}>
            {optionCount} opciones disponibles
          </Text>
          <Feather name="chevron-right" size={18} color={Colors.textMuted} />
        </View>
      </View>
    </Pressable>
  );
}

function OptionPreview({ number, text }: { number: number; text: string }) {
  return (
    <View style={styles.optionRow}>
      <View style={styles.optionNumber}>
        <Text style={styles.optionNumberText}>{number}</Text>
      </View>
      <Text style={styles.optionText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: minutas, isLoading, isRefetching, refetch } = useQuery<Minuta[]>({
    queryKey: ["/api/minutas", user?.casinoId ?? "none"],
    enabled: !!user?.casinoId,
  });

  function handleLogout() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    logout();
    router.replace("/login");
  }

  const sortedMinutas = (minutas ?? []).sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Platform.OS === "web" ? 67 : insets.top,
          paddingBottom: Platform.OS === "web" ? 34 : insets.bottom,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require("@/assets/images/vascan-logo.webp")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.greeting}>
              Hola, {user?.nombre}
            </Text>
            <Text style={styles.roleTag}>
              {user?.role === "admin"
                ? "Administrador"
                : user?.role === "interlocutor"
                  ? "Interlocutor"
                  : "Comensal"}
            </Text>
          </View>
        </View>
        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <Feather name="log-out" size={22} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons
          name="silverware-fork-knife"
          size={22}
          color={Colors.primary}
        />
        <Text style={styles.sectionTitle}>Minutas de la Semana</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Cargando minutas...</Text>
        </View>
      ) : !user?.casinoId ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={48}
            color={Colors.textMuted}
          />
          <Text style={styles.emptyTitle}>Sin casino asignado</Text>
          <Text style={styles.emptyText}>
            Contacta a tu administrador para ser asignado a un casino
          </Text>
        </View>
      ) : sortedMinutas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="food-off"
            size={48}
            color={Colors.textMuted}
          />
          <Text style={styles.emptyTitle}>Sin minutas disponibles</Text>
          <Text style={styles.emptyText}>
            No hay menús programados para esta semana
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedMinutas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MinutaCard item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
            />
          }
          scrollEnabled={sortedMinutas.length > 0}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerLogo: {
    width: 44,
    height: 44,
  },
  greeting: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: Colors.text,
  },
  roleTag: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.primaryLight,
  },
  logoutButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: Colors.text,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },
  minutaCard: {
    flexDirection: "row",
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  minutaCardToday: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  minutaCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  dateColumn: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  dateColumnToday: {
    backgroundColor: "rgba(212, 168, 67, 0.15)",
  },
  dayText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  dayTextToday: {
    color: Colors.primary,
  },
  dateNum: {
    fontFamily: "Poppins_700Bold",
    fontSize: 28,
    color: Colors.text,
    lineHeight: 34,
  },
  dateNumToday: {
    color: Colors.primary,
  },
  monthText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  monthTextToday: {
    color: Colors.primaryLight,
  },
  menuContent: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  todayBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  todayBadgeText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 10,
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  optionsList: {
    gap: 5,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(212, 168, 67, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionNumberText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: Colors.primary,
  },
  optionText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  menuFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  optionCountText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: Colors.text,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
