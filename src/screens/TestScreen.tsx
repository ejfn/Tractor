import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";

const TestScreen = () => {
  const [count, setCount] = React.useState(0);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>This is a test screen</Text>
      <Button 
        title="Click Me"
        onPress={() => {
          console.log("Button pressed\!");
          setCount(count + 1);
          alert("Button was pressed\!");
        }}
      />
      <Text style={styles.countText}>Count: {count}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5FCFF"
  },
  text: {
    fontSize: 20,
    textAlign: "center",
    margin: 10
  },
  countText: {
    fontSize: 16,
    textAlign: "center",
    margin: 10
  }
});

export default TestScreen;

