// Mock API for testing without backend
export const mockLogin = async (email: string, password: string) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock success response
  return {
    ok: true,
    json: async () => ({
      success: true,
      data: {
        user: { email, firstName: 'Demo', lastName: 'User' },
        token: 'mock-jwt-token'
      }
    })
  };
};

export const mockRegister = async (userData: any) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    ok: true,
    json: async () => ({
      success: true,
      message: 'Registration successful'
    })
  };
};
