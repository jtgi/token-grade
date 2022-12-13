import { CheckCircleIcon, WarningIcon } from "@chakra-ui/icons";

import {
  Alert,
  AlertDescription, AlertTitle,
  Box,
  Collapse,
  Grid,
  GridItem,
  Input,
  keyframes, Stack,
  Text
} from "@chakra-ui/react";
import { isAddress } from "@ethersproject/address";
import axios from "axios";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { isMobile } from 'react-device-detect';
import { useQuery } from "react-query";
import { Filter } from "../types";

function useContractSimulation(address?: string) {
  return useQuery<{ results: Filter[] }, { error: string; detail: string }>(
    ["permissions", address],
    async () =>
      await axios
        .get(`/api/contracts/${address}`)
        .then((res) => res.data)
        .catch((err) => Promise.reject(err.response.data)),
    {
      enabled: !!address && isAddress(address),
    }
  );
}

const borderFlicker = keyframes`
  from { border-color: #8fa8b6; }
  to { border-color: #2f3d53; }
`;

const pulse = keyframes`
  from { transform: scale(1); }
  to { transform: scale(1.01); }
`;

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [address, setAddress] = useState();
  const { isLoading, data, error } = useContractSimulation(address);

  useQueryParamSync("q", address);
  useEffect(() => {
    if (!isMobile) {
      inputRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validAddress = address && isAddress(address);
  const blocked = data?.results.filter((res: Filter) => res.disabled) || [];
  const allowed = data?.results.filter((res: Filter) => !res.disabled) || [];

  return (
    <>
      <Head>
        <title>Permission</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Stack
        position={"absolute"}
        top={"50%"}
        left={"50%"}
        transform={"translate(-50%, -50%)"}
        spacing={0}
        maxWidth={650}
        boxShadow={"lg"}
        borderRadius={8}
        w={["90%", "75%", "50%", "50%"]}
      >
        <Stack
          spacing={5}
          borderRadius={8}
          transform={"scale(1)"}
          borderBottomRadius={!!data || !!error ? 0 : 8}
          border="1px solid rgb(31 41 75)"
          animation={` 0.5s ease-in-out infinity`}
          background={"rgb(31 41 55)"}
          padding={8}
        >
          <Box>
            <Text
              align={"center"}
              fontSize={"lg"}
              fontWeight="bold"
              color={"orange.400"}
            >
              &gt; token grade
            </Text>
            <Text align={"center"}>
              Check any contract for marketplace restrictions
            </Text>
          </Box>
          <Input
            ref={inputRef}
            borderColor={"gray.700"}
            name="address"
            value={address}
            animation={
              isLoading ? `${borderFlicker} 0.2s linear infinite` : undefined
            }
            cursor={isLoading ? "wait" : "text"}
            focusBorderColor={"gray.600"}
            onChange={(e) => setAddress(e.target.value as any)}
            disabled={isLoading}
            placeholder="0x938..."
            bg={"gray.800"}
            size={"lg"}
          />
        </Stack>

        <Stack
          bg={"white"}
          color={"gray.800"}
          background={
            "linear-gradient(to bottom, rgba(255, 255, 255, 0.25) 0%, rgba(0, 0, 0, 0.15) 100%), radial-gradient(at top center, rgba(255, 255, 255, 0.70) 0%, rgba(0, 0, 0, 0.20) 120%) #FFF"}
          backgroundBlendMode="multiply, multiply"
          borderBottomRadius={8}
          boxShadow="lg"
        >
          <Collapse animateOpacity in={Boolean(error)}>
              <Box padding="5">
                <Alert variant={"subtle"} bg="none" justifyContent={'center'} textAlign="center" >
                  <Box>
                    <AlertTitle>{error?.error}</AlertTitle>
                    <AlertDescription display="block">
                      You sure that&apos;s the right address?
                    </AlertDescription>
                  </Box>
                </Alert>
              </Box>
          </Collapse>

          <Collapse animateOpacity in={!!data}>
            <Box padding="8" pt="5">
              <Text fontSize={"lg"} fontWeight="bold" mb="2">
                {blocked.length === 0 && "No Marketplaces Blocked"}
                {blocked.length === 1 && "1 Marketplace Blocked"}
                {blocked.length > 1 && `${blocked.length} Marketplaces Blocked`}
              </Text>
              <Grid
                templateColumns={{
                  md: "repeat(2, 1fr)",
                  sm: "repeat(1, 1fr)",
                }}
              >
                {(data?.results || []).map((res: Filter) => (
                  <GridItem key={res.address}>
                    {res.disabled ? (
                      <WarningIcon color={"red.700"} mt={-1} mr="1.5" />
                    ) : (
                      <CheckCircleIcon color={"green.700"} mt={-1} mr="1.5" />
                    )}
                    {res.name}
                  </GridItem>
                ))}
              </Grid>
            </Box>
          </Collapse>
        </Stack>
      </Stack>
    </>
  );
}

function useQueryParamSync(
  key: string,
  value: string | number | null | undefined
) {
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (!value) {
      q.delete(key);
    } else {
      q.set(key, value + "");
    }

    const path = window.location.pathname + "?" + q.toString();
    history.pushState(null, "", path);
  }, [key, value]);
}
