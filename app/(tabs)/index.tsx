import React, { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { supabase } from "../../lib/utils/supabase"; // adjust path as needed

type Todo = {
  id: number;
  title: string;
};

export default function Dashboard() {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const getTodos = async () => {
      const { data, error } = await supabase.from("todos").select();
      if (error) {
        console.error(error);
      } else {
        setTodos(data); // ✅ Now no error
      }
    };

    getTodos();
  }, []);

  return (
    <View>
      <Text>Todos:</Text>
      <FlatList
        data={todos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <Text>{item.title}</Text>}
      />
    </View>
  );
}
