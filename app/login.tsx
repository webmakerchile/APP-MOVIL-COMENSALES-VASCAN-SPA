import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { usePwaInstall } from "@/lib/use-pwa-install";

export default function LoginScreen() {
  const [rut, setRut] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { canInstall, install, showIosGuide } = usePwaInstall();
  const insets = useSafeAreaInsets();

  function formatRut(value: string) {
    let cleaned = value.replace(/[^0-9kK]/g, "").toUpperCase();
    if (cleaned.length > 9) cleaned = cleaned.slice(0, 9);

    if (cleaned.length <= 1) {
      setRut(cleaned);
      return;
    }

    const body = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1);

    let formatted = "";
    const reversed = body.split("").reverse();
    for (let i = 0; i < reversed.length; i++) {
      if (i > 0 && i % 3 === 0) formatted = "." + formatted;
      formatted = reversed[i] + formatted;
    }
    formatted = formatted + "-" + dv;
    setRut(formatted);
  }

  function cleanRut(formattedRut: string): string {
    return formattedRut.replace(/\./g, "");
  }

  async function handleLogin() {
    if (!rut.trim() || !password.trim()) {
      setError("Ingrese RUT y contraseña");
      return;
    }

    setError("");
    setLoading(true);

    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      await login(cleanRut(rut.trim()), password);
      router.replace("/(main)/home");
    } catch (e: any) {
      setError(e.message?.includes("401") ? "RUT o contraseña incorrectos" : "Error al iniciar sesión");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  }

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
      <KeyboardAwareScrollViewCompat
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Image
            source={require("@/assets/images/vascan-logo.webp")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Bienvenido</Text>
          <Text style={styles.subtitle}>
            Ingresa con tu RUT para acceder al sistema de comensales
          </Text>
        </View>

        <View style={styles.formSection}>
          {error ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>RUT</Text>
            <View style={styles.inputWrapper}>
              <Feather
                name="user"
                size={20}
                color={Colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Ej: 12345678-9"
                placeholderTextColor={Colors.textMuted}
                value={rut}
                onChangeText={formatRut}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
                testID="rut-input"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contraseña</Text>
            <View style={styles.inputWrapper}>
              <Feather
                name="lock"
                size={20}
                color={Colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                testID="password-input"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={Colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.loginButtonPressed,
              loading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
            testID="login-button"
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
            )}
          </Pressable>

          {canInstall && (
            <Pressable
              style={({ pressed }) => [
                styles.installButton,
                pressed && styles.installButtonPressed,
              ]}
              onPress={install}
            >
              <Feather name="download" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.installButtonText}>Instalar app</Text>
            </Pressable>
          )}

          {showIosGuide && (
            <View style={styles.iosGuide}>
              <View style={styles.iosGuideHeader}>
                <Feather name="smartphone" size={15} color={Colors.primary} />
                <Text style={styles.iosGuideTitle}>Instalar en iPhone</Text>
              </View>
              <View style={styles.iosStep}>
                <View style={styles.iosStepIcon}>
                  <Feather name="upload" size={16} color={Colors.primary} />
                </View>
                <Text style={styles.iosStepText}>
                  Toca el ícono de <Text style={styles.iosStepBold}>compartir</Text> en Safari
                </Text>
              </View>
              <View style={styles.iosStep}>
                <View style={styles.iosStepIcon}>
                  <Feather name="plus-square" size={16} color={Colors.primary} />
                </View>
                <Text style={styles.iosStepText}>
                  Baja hasta <Text style={styles.iosStepBold}>"Agregar a inicio"</Text>
                </Text>
              </View>
              <View style={styles.iosStep}>
                <View style={styles.iosStepIcon}>
                  <Feather name="check-circle" size={16} color={Colors.primary} />
                </View>
                <Text style={styles.iosStepText}>
                  Toca <Text style={styles.iosStepBold}>"Agregar"</Text>
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Sistema de Inscripción de Comensales
          </Text>
          <Text style={styles.footerSubtext}>Vascan SPA</Text>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 180,
    height: 90,
    marginBottom: 24,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 32,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  formSection: {
    gap: 20,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(231, 76, 60, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(231, 76, 60, 0.3)",
  },
  errorText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: Colors.error,
    flex: 1,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  inputIcon: {
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
    color: Colors.text,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  loginButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  installButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: "rgba(212, 168, 67, 0.08)",
  },
  installButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  installButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: Colors.primary,
  },
  iosGuide: {
    borderWidth: 1,
    borderColor: "rgba(212, 168, 67, 0.25)",
    borderRadius: 14,
    backgroundColor: "rgba(212, 168, 67, 0.06)",
    padding: 16,
    gap: 12,
  },
  iosGuideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  iosGuideTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.primary,
  },
  iosStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iosStepIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(212, 168, 67, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  iosStepText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  iosStepBold: {
    fontFamily: "Poppins_600SemiBold",
    color: Colors.text,
  },
  footer: {
    alignItems: "center",
    marginTop: 48,
    paddingBottom: 20,
  },
  footerText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
  },
  footerSubtext: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.primaryLight,
    marginTop: 2,
  },
});
