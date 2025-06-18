import useSWR from 'swr';

const useInvitations = () => {
  const apiRoute = `/api/workspaces/invitations`;
  
  // Use the fetcher function explicitly to handle any issues with global config
  const fetcher = (url) => fetch(url).then(res => res.json());
  
  const { data, error } = useSWR(apiRoute, fetcher, {
    revalidateOnFocus: false, // Prevent excessive revalidation
    dedupingInterval: 5000,   // Cache results for 5 seconds
    suspense: false,          // Don't use React suspense
  });

  // Handle response format from both Pages Router and App Router
  // Pages Router: { data: { invitations: [...] } }
  // App Router: { data: { invitations: [...] } } (now aligned)
  const invitations = data?.data?.invitations || [];
  
  // Create a safe data response
  const safeData = {
    invitations,
    ...data?.data, // Include other fields from data.data
    ...data,       // Include other root fields from data
  };
  
  return {
    ...safeData,
    invitations,   // Ensure invitations is directly accessible
    isLoading: !error && !data,
    isError: error,
  };
};

export default useInvitations;
