import { PageSkeleton } from "@/components/ui/Skeleton";

/**
 * Het startscherm doet drie databasevragen voordat het iets kan tonen. Zonder
 * deze laadstaat blijft de oude pagina staan tot alles binnen is, en dat leest
 * als een knop die niets deed.
 */
export default function Loading() {
  return <PageSkeleton regels={3} />;
}
