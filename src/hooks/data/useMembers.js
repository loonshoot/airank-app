import useSWR from 'swr';

const useMembers = (slug) => {
  const apiRoute = `/api/workspace/${slug}/members`;
  const { data, error, mutate } = useSWR(slug ? apiRoute : null);
  return {
    ...data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useMembers;
