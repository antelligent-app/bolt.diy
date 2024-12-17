import { useEffect, useState } from "react"
import { ClientOnly } from "remix-utils/client-only"
import { APIKeyManager } from "~/components/chat/APIKeyManager"
import { Header } from "~/components/header/Header"
import { Menu } from "~/components/sidebar/Menu.client"
import { ProtectedView } from "~/components/ui/ProtectedView"
import { getAccountClient } from "~/lib/appwrite"
import { MODEL_LIST } from "~/utils/constants"

const providerList = [...new Set(MODEL_LIST.map((model) => model.provider))]

function ProviderKeys() {
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({});
  const fetchUserPreferrences = async () => {
    const preferrences = await getAccountClient().getPrefs();
    if (preferrences['providerKeys']) {
      try {
        setProviderKeys(JSON.parse(preferrences['providerKeys']))
      } catch (error) {
        console.error('Error parsing providerKeys preferrence');
      }
    }
  }
  const updateUserPreferrence = async () => {
    const preferrences = await getAccountClient().getPrefs();
    await getAccountClient().updatePrefs({
      ...preferrences,
      providerKeys: JSON.stringify(providerKeys)
    })
  }
  useEffect(() => {
    fetchUserPreferrences();
  }, [])
  useEffect(() => {
    updateUserPreferrence();
  }, [providerKeys])
  return <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <ClientOnly>{() => <Menu />}</ClientOnly>
      <Header />
      <div className="container mx-auto">
        <div className="px-4 sm:px-0">
          <h3 className="text-base/7 font-semibold text-bolt-elements-textPrimary">Provider Keys</h3>
          <p className="mt-1 max-w-2xl text-sm/6 text-bolt-elements-textSecondary">Add Your LLM Keys Here.</p>
        </div>
        <div className="mt-6 border-t border-gray-100">
          <dl className="divide-y divide-gray-100">
            {
              providerList.map((providerName) => (
                <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0" key={providerName}>
                  <dt className="text-sm/6 font-medium text-bolt-elements-textPrimary">{providerName}</dt>
                  <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0">
                    <APIKeyManager
                      provider={providerName}
                      apiKey={providerKeys[providerName] || ''}
                      setApiKey={(key) => {
                        setProviderKeys({
                          ...providerKeys,
                          [providerName]: key
                        })
                      }}
                    />
                  </dd>
                </div>
              ))
            }
          </dl>
        </div>
      </div>
    </div>
}

export default function ProtectedProviderKeys () {
  return <ProtectedView>
    <ProviderKeys></ProviderKeys>
  </ProtectedView>
}