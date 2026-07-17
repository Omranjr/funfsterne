import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type ImageStyle,
  type StyleProp,
} from "react-native";
import { Image, type ImageSource } from "expo-image";
import { ImageIcon } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";

export interface CachedImageProps {
  source: ImageSource | string | null | undefined;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  contentFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  transitionDuration?: number;
  placeholder?: React.ReactNode;
  fallbackText?: string;
  cachePolicy?: "memory-disk" | "memory" | "disk" | "none";
  testID?: string;
}

export function CachedImage({
  source,
  style,
  containerStyle,
  contentFit = "cover",
  transitionDuration = 300,
  placeholder,
  fallbackText = "No Image",
  cachePolicy = "memory-disk",
  testID,
}: CachedImageProps) {
  const { theme } = useTheme();
  const [hasError, setHasError] = useState(false);

  const resolvedSource: ImageSource | null =
    typeof source === "string"
      ? { uri: source }
      : source ?? null;

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  if (!resolvedSource || hasError) {
    return (
      <View
        testID={testID}
        style={[
          styles.placeholder,
          { backgroundColor: theme.muted },
          containerStyle,
          style,
        ]}
      >
        {placeholder ?? (
          <View style={styles.fallback}>
            <ImageIcon size={28} color={theme.textMuted} />
            {fallbackText ? (
              <Text style={[styles.placeholderText, { color: theme.textMuted }]}>
                {fallbackText}
              </Text>
            ) : null}
          </View>
        )}
      </View>
    );
  }

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        { backgroundColor: theme.muted },
        containerStyle,
        style,
      ]}
    >
      <Image
        source={resolvedSource}
        style={styles.image}
        contentFit={contentFit}
        cachePolicy={cachePolicy}
        transition={transitionDuration}
        onError={handleError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  placeholderText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
});
