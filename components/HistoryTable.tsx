import React, { FC } from "react";
import { useTable, usePagination } from "react-table";
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  IconButton,
  Text,
  Tooltip,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Link as ChakraLink,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  PopoverHeader,
  PopoverBody,
  Image,
  Icon,
  HStack,
} from "@chakra-ui/react";
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from "@chakra-ui/icons";
import { Video } from "@prisma/client";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-toastify";
import useSWR from "swr";
import dayjs from "dayjs";
import { AiFillCrown } from "react-icons/ai";
const utc = require("dayjs/plugin/utc");
const localizedFormat = require("dayjs/plugin/localizedFormat");
dayjs.extend(utc);
dayjs.extend(localizedFormat);

type Props = {
  data: any[];
  total: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
};

const HistoryTable: FC<Props> = ({
  data,
  total,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading,
}) => {
  const columns = React.useMemo(
    () => [
      {
        Header: "Played Requests",
        columns: [
          {
            Header: "Video",
            accessor: "Video",
            Cell: ({ row }) => {
              const video = row.original.Video;
              if (!video) return <Text>No video data</Text>;
              return (
                <HStack>
                  <Image
                    src={video.thumbnail}
                    maxW={"100px"}
                    rounded="lg"
                    objectFit="cover"
                    alt="video thumbnail"
                  />
                  <Link
                    href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
                    passHref
                  >
                    <ChakraLink fontWeight={"medium"} isExternal>
                      {video.title}
                    </ChakraLink>
                  </Link>
                </HStack>
              );
            },
          },
          {
            Header: "Priority",
            accessor: "priority",
            Cell: ({ value }) => {
              if (value) {
                return <Icon as={AiFillCrown} w={8} h={8} />;
              }
              return null;
            },
          },
          {
            Header: "Request By",
            accessor: "requested_by",
            Cell: ({ value }) => {
              return value ? <Text fontWeight={"medium"}>{value}</Text> : null;
            },
          },
          {
            Header: "Time Played",
            accessor: "played_at",
            Cell: ({ value }) => {
              return value ? (
                <Text fontWeight={"medium"}>{dayjs(value).format("LLL")}</Text>
              ) : null;
            },
          },
          {
            Header: "VOD Link",
            accessor: "vod_link",
            Cell: ({ value }) => {
              if (value) {
                return (
                  <ChakraLink href={value} fontWeight={"medium"} isExternal>
                    <Button fontWeight={"medium"}>Watch VOD</Button>
                  </ChakraLink>
                );
              } else {
                return null;
              }
            },
          },
        ],
      },
    ],
    []
  );

  // Calculate page count
  const pageCount = Math.ceil(total / pageSize);

  // Use the react-table hooks
  const { getTableProps, getTableBodyProps, headerGroups, prepareRow, page } =
    useTable(
      {
        columns,
        data,
        initialState: { pageIndex, pageSize },
        manualPagination: true,
        pageCount,
      },
      usePagination
    );

  // Render the UI for your table
  return (
    <>
      {isLoading ? (
        <Text>Loading...</Text>
      ) : (
        <>
          <Table {...getTableProps()}>
            <Thead>
              {headerGroups.map((headerGroup, i) => (
                <Tr
                  {...headerGroup.getHeaderGroupProps()}
                  key={`header-group-${i}`}
                >
                  {headerGroup.headers.map((column) => (
                    <Th {...column.getHeaderProps()} key={column.id}>
                      {column.render("Header")}
                    </Th>
                  ))}
                </Tr>
              ))}
            </Thead>
            <Tbody {...getTableBodyProps()}>
              {page.map((row, i) => {
                prepareRow(row);
                return (
                  <Tr {...row.getRowProps()} key={`row-${i}`}>
                    {row.cells.map((cell) => (
                      <Td {...cell.getCellProps()} key={cell.column.id}>
                        {cell.render("Cell")}
                      </Td>
                    ))}
                  </Tr>
                );
              })}
            </Tbody>
          </Table>

          <Flex justifyContent="space-between" m={4} alignItems="center">
            <Flex>
              <Tooltip label="First Page">
                <IconButton
                  display={["none", "block"]}
                  aria-label="Go to first page"
                  onClick={() => onPageChange(0)}
                  isDisabled={pageIndex === 0}
                  icon={<ArrowLeftIcon h={3} w={3} />}
                  mr={4}
                />
              </Tooltip>
              <Tooltip label="Previous Page">
                <IconButton
                  aria-label="Go to previous page"
                  onClick={() => onPageChange(Math.max(0, pageIndex - 1))}
                  isDisabled={pageIndex === 0}
                  icon={<ChevronLeftIcon h={6} w={6} />}
                />
              </Tooltip>
            </Flex>

            <Flex alignItems="center">
              <Text flexShrink={0} mr={8}>
                Page{" "}
                <Text fontWeight="bold" as="span">
                  {pageIndex + 1}
                </Text>{" "}
                of{" "}
                <Text fontWeight="bold" as="span">
                  {pageCount}
                </Text>
              </Text>
              <Text flexShrink={0}>Go to page:</Text>{" "}
              <NumberInput
                ml={2}
                mr={8}
                w={28}
                min={1}
                max={pageCount}
                onChange={(value) => {
                  const page = value ? parseInt(value as string) - 1 : 0;
                  onPageChange(page);
                }}
                value={pageIndex + 1}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <Select
                w={32}
                value={pageSize}
                onChange={(e) => {
                  onPageSizeChange(Number(e.target.value));
                  onPageChange(0);
                }}
              >
                {[10, 20, 30, 40, 50].map((size) => (
                  <option key={size} value={size}>
                    Show {size}
                  </option>
                ))}
              </Select>
            </Flex>

            <Flex>
              <Tooltip label="Next Page">
                <IconButton
                  aria-label="Go to Next Page"
                  onClick={() =>
                    onPageChange(Math.min(pageCount - 1, pageIndex + 1))
                  }
                  isDisabled={pageIndex >= pageCount - 1}
                  icon={<ChevronRightIcon h={6} w={6} />}
                />
              </Tooltip>
              <Tooltip label="Last Page">
                <IconButton
                  display={["none", "block"]}
                  aria-label="Go to last page"
                  onClick={() => onPageChange(pageCount - 1)}
                  isDisabled={pageIndex >= pageCount - 1}
                  icon={<ArrowRightIcon h={3} w={3} />}
                  ml={4}
                />
              </Tooltip>
            </Flex>
          </Flex>
        </>
      )}
    </>
  );
};

export default HistoryTable;
