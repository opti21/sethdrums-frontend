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
const utc = require("dayjs/plugin/utc");
const localizedFormat = require("dayjs/plugin/localizedFormat");
dayjs.extend(utc);
dayjs.extend(localizedFormat);

type Props = {
  data: any[];
};

const BanTable: FC<Props> = ({ data }) => {
  const { mutate } = useSWR("/api/mod/videos/banned");

  const handleUnban = async (videoID: number) => {
    await axios
      .delete("/api/mod/videos/banned", {
        data: {
          videoID,
        },
      })
      .then((res) => {
        if (res.status === 200) {
          mutate();
          toast.success("Video Unbanned");
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Error unbanning video");
      });
  };

  const columns = React.useMemo(
    () => [
      {
        Header: "Banned Videos",
        columns: [
          {
            Header: "Title",
            accessor: "title",
            Cell: ({ value, row }) => {
              return (
                <Link
                  href={`https://www.youtube.com/watch?v=${row.original.youtube_id}`}
                  passHref
                >
                  <ChakraLink isExternal>{value}</ChakraLink>
                </Link>
              );
            },
          },
          {
            Header: "Notes",
            accessor: "notes",
          },
          {
            Header: "Banned By",
            accessor: "banned_by",
            Cell: ({ row, value }) => {
              return (
                <Tooltip
                  label={dayjs(row.original.banned_time).format("LLL")}
                  aria-label="Banned time tooltip"
                >
                  <Text>{value}</Text>
                </Tooltip>
              );
            },
          },
          {
            Header: "Unban",
            Cell: ({ row }) => {
              console.log(row.original);
              return (
                <Button
                  onClick={() => handleUnban(row.original.id)}
                  colorScheme={"green"}
                >
                  Unban
                </Button>
              );
            },
          },
        ],
      },
    ],
    []
  );
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page, // Instead of using 'rows', we'll use page,
    // which has only the rows for the active page

    // The rest of these things are super handy, too ;)
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize },
  } = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0 },
    },
    usePagination
  );

  // Render the UI for your table
  return (
    <>
      <Table {...getTableProps()}>
        <Thead>
          {headerGroups.map((headerGroup, headerGroupIndex) => (
            <Tr
              key={`headerGroup${headerGroupIndex}`}
              {...headerGroup.getHeaderGroupProps()}
            >
              {headerGroup.headers.map((column, columnIndex) => (
                <Th
                  key={`headerColumn${columnIndex}`}
                  {...column.getHeaderProps()}
                >
                  {column.render("Header")}
                </Th>
              ))}
            </Tr>
          ))}
        </Thead>
        <Tbody {...getTableBodyProps()}>
          {page.map((row, rowIndex) => {
            prepareRow(row);
            return (
              <Tr key={`row${rowIndex}`} {...row.getRowProps()}>
                {row.cells.map((cell, cellIndex) => {
                  return (
                    <Td key={`cell${cellIndex}`} {...cell.getCellProps()}>
                      {cell.render("Cell")}
                    </Td>
                  );
                })}
              </Tr>
            );
          })}
        </Tbody>
      </Table>

      <Flex justifyContent="space-between" m={4} alignItems="center">
        <Flex>
          <Tooltip label="First Page">
            <IconButton
              aria-label="Go to first page"
              onClick={() => gotoPage(0)}
              isDisabled={!canPreviousPage}
              icon={<ArrowLeftIcon h={3} w={3} />}
              mr={4}
            />
          </Tooltip>
          <Tooltip label="Previous Page">
            <IconButton
              aria-label="Go to previous page"
              onClick={previousPage}
              isDisabled={!canPreviousPage}
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
              {pageOptions.length}
            </Text>
          </Text>
          <Text flexShrink={0}>Go to page:</Text>{" "}
          <NumberInput
            ml={2}
            mr={8}
            w={28}
            min={1}
            max={pageOptions.length}
            onChange={(value) => {
              const page = value ? parseInt(value) - 1 : 0;
              gotoPage(page);
            }}
            defaultValue={pageIndex + 1}
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
              setPageSize(Number(e.target.value));
            }}
          >
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </Select>
        </Flex>

        <Flex>
          <Tooltip label="Next Page">
            <IconButton
              aria-label="Go to Next Page"
              onClick={nextPage}
              isDisabled={!canNextPage}
              icon={<ChevronRightIcon h={6} w={6} />}
            />
          </Tooltip>
          <Tooltip label="Last Page">
            <IconButton
              aria-label="Go to last page"
              onClick={() => gotoPage(pageCount - 1)}
              isDisabled={!canNextPage}
              icon={<ArrowRightIcon h={3} w={3} />}
              ml={4}
            />
          </Tooltip>
        </Flex>
      </Flex>
    </>
  );
};

export default BanTable;
