import { Text, View } from "react-native";
import { ProductSchema, type Product } from "@funfsterne/shared-types";

export default function HomeScreen() {
  const sample: Product = {
    id: "1",
    name: "Sample Product",
    description: "Workspace resolution test",
    basePrice: 9.99,
    category: "HAIR",
    images: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const parsed = ProductSchema.safeParse(sample);

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-3xl font-bold text-primary mb-2">FünfSterne</Text>
      <Text className="text-text-muted text-center">
        {parsed.success
          ? `Shared-types resolved: ${parsed.data.name}`
          : "Shared-types parse failed"}
      </Text>
    </View>
  );
}
