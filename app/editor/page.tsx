import { EditorHomeClient } from "@/components/editor/editor-home-client";
import { getEditorProjects } from "@/lib/project-data";

export default async function EditorPage() {
  const { ownedProjects, sharedProjects } = await getEditorProjects();

  return (
    <EditorHomeClient
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    />
  );
}
