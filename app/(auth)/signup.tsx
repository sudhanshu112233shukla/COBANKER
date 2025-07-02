import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { ClerkProvider, useSignUp } from "@clerk/clerk-expo";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/utils/supabase"; // Adjust path if needed
import { Picker } from "@react-native-picker/picker";

const CLERK_PUBLISHABLE_KEY =
  Constants.expoConfig?.extra?.expoPublicClerkPublishableKey ||
  "pk_test_ZW5kbGVzcy1jaGFtb2lzLTI1LmNsZXJrLmFjY291bnRzLmRldiQ";

type UserTypeOption = {
  label: string;
  value: string;
};

const USER_TYPES: UserTypeOption[] = [
  { label: "Member", value: "member" },
  { label: "Customer", value: "customer" },
  { label: "Bank", value: "bank" },
  { label: "Branch", value: "branch" },
];

// Define form fields for each user type
const userTypeFields = {
  member: [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "password", label: "Password", secure: true },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
  ],
  customer: [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "password", label: "Password", secure: true },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
  ],
  bank: [
    { key: "bankName", label: "Bank Name" },
    { key: "email", label: "Email" },
    { key: "password", label: "Password", secure: true },
    { key: "bankCode", label: "Bank Code" },
    { key: "address", label: "Address" },
  ],
  branch: [
    { key: "branchName", label: "Branch Name" },
    { key: "email", label: "Email" },
    { key: "password", label: "Password", secure: true },
    { key: "branchCode", label: "Branch Code" },
    { key: "bankCode", label: "Bank Code" },
    { key: "address", label: "Address" },
  ],
};

export default function SignUpScreen() {
  return <SignUpForm />;
}

function SignUpForm() {
  const { signUp, setActive } = useSignUp();
  const router = useRouter();

  type UserType = keyof typeof userTypeFields;
  const [userType, setUserType] = useState<UserType>("member");
  interface FormState {
    [key: string]: string;
  }
  const [form, setForm] = useState<FormState>({});
  const [pendingVerification, setPendingVerification] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle input changes

  const handleChange = (key: string, value: string) => {
    setForm((prev: FormState) => ({ ...prev, [key]: value }));
  };

  // Handle sign up with Clerk
  const handleSignUp = async () => {
    setError("");
    setLoading(true);
    try {
      if (!signUp) {
        setError("Sign up service is not available.");
        setLoading(false);
        return;
      }
      await signUp.create({
        emailAddress: form.email,
        password: form.password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "errors" in err &&
        Array.isArray((err as any).errors)
      ) {
        setError((err as any).errors?.[0]?.message || "Sign up failed");
      } else if (err instanceof Error) {
        setError(err.message || "Sign up failed");
      } else {
        setError("Sign up failed");
      }
    }
    setLoading(false);
  };

  // Handle email verification and save to Supabase
  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      if (!signUp) {
        setError("Sign up service is not available.");
        setLoading(false);
        return;
      }
      const result = await signUp.attemptEmailAddressVerification({
        code: emailCode,
      });
      await setActive({ session: result.createdSessionId });

      // Save user details to Supabase
      let table = "";
      let data = { ...form };
      data.userType = userType;

      switch (userType) {
        case "member":
          table = "members";
          break;
        case "customer":
          table = "customers";
          break;
        case "bank":
          table = "banks";
          break;
        case "branch":
          table = "branches";
          break;
        default:
          table = "users";
      }

      // Remove password before saving to DB
      if ("password" in data) {
        delete data.password;
      }

      const { error: dbError } = await supabase.from(table).insert([data]);
      if (dbError) {
        setError("Failed to save user details: " + dbError.message);
        setLoading(false);
        return;
      }

      Alert.alert("Success", "Sign up complete!");
      router.replace("/");
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "errors" in err &&
        Array.isArray((err as any).errors)
      ) {
        setError((err as any).errors?.[0]?.message || "Verification failed");
      } else if (err instanceof Error) {
        setError(err.message || "Verification failed");
      } else {
        setError("Verification failed");
      }
    }
    setLoading(false);
  };

  // Render form fields based on user type
  const renderFields = () => {
    return userTypeFields[userType].map((field) => (
      <TextInput
        key={field.key}
        style={styles.input}
        placeholder={field.label}
        secureTextEntry={field.secure || false}
        autoCapitalize={field.key === "email" ? "none" : "sentences"}
        value={form[field.key] || ""}
        onChangeText={(text) => handleChange(field.key, text)}
      />
    ));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.label}>Select User Type:</Text>
      <Picker
        selectedValue={userType}
        onValueChange={(itemValue: string, itemIndex: number) => {
          setUserType(itemValue as UserType);
          setForm({}); // Reset form fields on user type change
        }}
      >
        {USER_TYPES.map((type: UserTypeOption) => (
          <Picker.Item key={type.value} label={type.label} value={type.value} />
        ))}
      </Picker>
      {!pendingVerification ? (
        <>
          {renderFields()}
          <Button
            title={loading ? "Signing Up..." : "Sign Up"}
            onPress={handleSignUp}
            disabled={loading}
          />
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Verification Code"
            value={emailCode}
            onChangeText={setEmailCode}
          />
          <Button
            title={loading ? "Verifying..." : "Verify Email"}
            onPress={handleVerify}
            disabled={loading}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 24,
    color: "#000",
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: "#000",
  },
  picker: {
    marginBottom: 16,
    color: "#000",
    backgroundColor: "#fff",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    color: "#000",
    backgroundColor: "#fff",
  },
  error: {
    color: "red",
    marginBottom: 12,
    textAlign: "center",
  },
});
