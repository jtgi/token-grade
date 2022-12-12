import { CheckCircleIcon, WarningIcon } from "@chakra-ui/icons";
import { useRouter } from "next/router";

import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box, Collapse, Grid,
  GridItem, Input, SkeletonCircle, Stack,
  Text
} from "@chakra-ui/react";
import { isAddress } from "@ethersproject/address";
import axios from "axios";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "react-query";
import { operators } from "../lib/operators";
import { Filter } from "../types";

export default function Home() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  //TODO: fix this
  const q = useRef<string | undefined>(router.query.q as string);
  const [query, setQuery] = useState<string | undefined>(q.current && isAddress(q.current) ? q.current : '');
  const [address, setAddress] = useState(q.current || '');

  useQueryParamSync("q", query);

  const { isLoading, data, error, refetch } = useQuery<
    { results: Filter[] },
    { error: string, detail: string }
  >(
    ["permissions", query],
    async () =>
      await axios
        .get(`/api/contracts/${address}`)
        .then((res) => res.data)
        .catch((err) => Promise.reject(err.response.data)),
    { enabled: !!query && isAddress(query) }
  );

  useEffect(() => inputRef.current?.focus())

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
        borderRadius={10}
        w={["90%", "75%", "50%", "50%"]}
      >
        <Stack
          spacing={5}
          borderRadius={10}
          borderBottomRadius={!!query && isAddress(query) ? 0 : 10}
          border="1px solid rgb(31 41 75)"
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
            focusBorderColor={"gray.600"}
            autoFocus
            onChange={(e) => {
              const a = e.target.value;
              setAddress(a);
              if (isAddress(a)) {
                setQuery(a);
                refetch();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
              if (address && isAddress(address)) {
                setQuery(address);
                refetch();
              }
              }
            }}
            disabled={isLoading}
            placeholder="0x938..."
            bg={"gray.800"}
            size={"lg"}
          />
        </Stack>

        <Stack bg={"white"} color={"gray.800"} borderBottomRadius={"lg"} boxShadow="lg">
          {error && (
            <Box padding="8">
              <Alert variant={"subtle"} alignItems={"start"} wordBreak="break-all">
                <AlertIcon />
                <Box>
                  <AlertTitle>We couldn&apos;t verify that contract</AlertTitle>
                  <AlertDescription display="block">
                    Are you sure that&apos;s the right address?
                  </AlertDescription>
                </Box>
              </Alert>
            </Box>
          )}

          <Collapse animateOpacity in={isLoading || !!data}>
            {isLoading && <Box padding="8">
              <Text fontSize={"lg"} fontWeight="bold">
                Checking {operators.length} Marketplaces...
              </Text>
              <Grid
                templateColumns={{
                  md: "repeat(2, 1fr)",
                  sm: "repeat(1, 1fr)",
                }}
              >
                {operators.map((res: Filter) => (
                  <GridItem key={res.address}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <SkeletonCircle size="4" mr="2" />
                      {res.name}
                    </Box>
                  </GridItem>
                ))}
              </Grid>
            </Box>}

            {data && (
              <Box padding="8">
                <Text fontSize={"lg"} fontWeight="bold">
                  {blocked.length === 0 && "No Marketplace Blocked"}
                  {blocked.length === 1 && "1 Marketplace Blocked"}
                  {blocked.length > 1 &&
                    `${blocked.length} Marketplaces Blocked`}
                </Text>
                <Grid
                  templateColumns={{
                    md: "repeat(2, 1fr)",
                    sm: "repeat(1, 1fr)",
                  }}
                >
                  {data.results.map((res: Filter) => (
                    <GridItem key={res.address}>
                      {res.disabled ? (
                        <WarningIcon color={"red.700"} mt={-1} />
                      ) : (
                        <CheckCircleIcon color={"green.700"} mt={-1} />
                      )}{" "}
                      {res.name}
                    </GridItem>
                  ))}
                </Grid>
              </Box>
            )}
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
