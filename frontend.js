import AsyncStorage from '@react-native-async-storage/async-storage';

const login = async (email, password) => {
  const res = await axios.post("http://127.0.0.1:8000/auth/login", { email, password });
  await AsyncStorage.setItem("token", res.data.access_token);
};

